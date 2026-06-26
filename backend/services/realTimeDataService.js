import { getDb } from './database.js';
import { gpsToLocalMap } from '../utils/gps.js';

const MAX_ALERTS = 500;
const MAX_NOTIFICATIONS = 200;
const ALERT_TTL = 24 * 60 * 60 * 1000; // 24h
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1h

function predictIncidentCause(heartRate, seismicHz, env) {
  // 1. Éboulement / Secousse sismique
  if (seismicHz && seismicHz > 50) {
    return `Éboulement / Secousse sismique détectée (Vibrations montre: ${seismicHz}Hz)`;
  }
  
  if (env) {
    // 2. Poche de gaz / Asphyxie (CO2 élevé)
    if (env.co2_level && env.co2_level > 500) {
      return `Asphyxie / Présence de gaz CO₂ élevé dans la zone (${env.co2_level}ppm)`;
    }
    
    // 3. Poussière / Incendie (Poussière élevée)
    if (env.dust_level && env.dust_level > 1.5) {
      return `Difficulté respiratoire / Concentration de poussière élevée (${env.dust_level}mg/m³)`;
    }
    
    // 4. Coup de chaleur (Température de la zone élevée)
    if (env.temperature && env.temperature > 33) {
      return `Coup de chaleur / Température de zone excessive (${env.temperature.toFixed(1)}°C)`;
    }
  }

  // 5. Malaise cardiaque (Rythme élevé)
  if (heartRate && heartRate > 120) {
    return `Malaise cardiaque / Tachycardie (Rythme cardiaque élevé: ${heartRate}bpm)`;
  }
  
  // 6. Cause par défaut
  return "Chute accidentelle / Perte d'équilibre ou Glissade";
}

export class RealTimeDataService {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.miners = new Map();
    this.alerts = [];
    this.notifications = [];
    this.lastPreventiveAlert = new Map();
    this.cleanupTimer = null;
    this.startCleanup();
    this.loadMinersFromDb();
  }

  loadMinersFromDb() {
    try {
      const db = getDb();
      const dbMiners = db.prepare('SELECT * FROM miners').all();
      dbMiners.forEach(m => {
        let trajectory = [];
        try {
          const logs = db.prepare('SELECT x, y, created_at FROM gps_track_logs WHERE miner_id = ? ORDER BY created_at ASC LIMIT 100').all(m.id);
          trajectory = logs.map(l => ({
            x: l.x,
            y: l.y,
            timestamp: new Date(l.created_at).getTime()
          }));
        } catch (err) {
          console.warn(`Erreur lors de la lecture des logs de trajectoire pour le mineur ${m.id}:`, err);
        }

        this.miners.set(m.id, {
          id: m.id,
          name: m.name,
          matricule: m.matricule,
          role: m.role,
          phone: m.phone,
          emergency_contact: m.emergency_contact,
          blood_group: m.blood_group,
          zone: m.zone || 'ZONE B',
          gallery: m.gallery || 'Galerie 1',
          photo: m.photo,
          account_status: m.account_status,
          watch_id: m.watch_id,
          status: m.status || 'safe',
          heartRate: m.heart_rate || 70,
          temperature: m.temperature || 36.5,
          battery: m.battery || 100,
          position: { x: m.x || 500, y: m.y || 250, timestamp: Date.now() },
          trajectory: trajectory.length > 0 ? trajectory : (m.x && m.y ? [{ x: m.x, y: m.y, timestamp: Date.now() }] : []),
          is_in_service: m.is_in_service === 1,
          is_underground: m.is_underground === 1,
          entry_time: m.entry_time,
          exit_time: m.exit_time,
          activityLevel: 5
        });
      });
      console.log(`✅ Loaded ${this.miners.size} miners from DB into RealTimeDataService`);
    } catch (e) {
      console.error("❌ Failed to load miners from DB:", e);
    }
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  cleanup() {
    const now = Date.now();

    // Supprimer les alertes résolues de plus de 24h
    this.alerts = this.alerts.filter(a => {
      if (a.resolved && (now - a.timestamp) > ALERT_TTL) return false;
      return true;
    });

    // Limiter le nombre d'alertes
    if (this.alerts.length > MAX_ALERTS) {
      this.alerts = this.alerts.slice(-MAX_ALERTS);
    }

    // Supprimer les notifications lues de plus de 24h
    this.notifications = this.notifications.filter(n => {
      if (n.read && (now - n.timestamp) > ALERT_TTL) return false;
      return true;
    });

    // Limiter le nombre de notifications
    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(-MAX_NOTIFICATIONS);
    }
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      this.websocketManager.broadcast('alert-resolved', {
        alertId: alertId
      });
    }
  }

  createNotification(notificationData) {
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notificationData,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.push(notification);
    this.websocketManager.broadcastNotification(notification);
  }

  getMiners() {
    return Array.from(this.miners.values());
  }

  getAlerts() {
    return this.alerts;
  }

  getUnresolvedAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  getNotifications() {
    return this.notifications;
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  processLoRaData(data) {
    if (!data || !data.type) {
      console.warn('Données LoRa invalides:', data);
      return;
    }

    // Map watch_id to miner_id if data.minerId is a watch physical ID
    let watchId = data.minerId;
    if (!watchId && data.workerId) watchId = data.workerId;
    
    // Find the miner associated with this watch_id in our map
    let miner = null;
    if (watchId) {
      miner = Array.from(this.miners.values()).find(m => m.watch_id === watchId);
    }
    
    // Fallback: search by matricule
    if (!miner && watchId) {
      miner = this.miners.get(watchId);
    }

    if (!miner) {
      console.warn(`⚠️ Télémétrie reçue pour une montre non assignée: ${watchId}`);
      // Record this watch in the watches table so it shows up in Devices list
      try {
        const db = getDb();
        db.prepare("INSERT OR IGNORE INTO watches (id, status) VALUES (?, 'available')").run(watchId);
      } catch (e) {}
      return;
    }

    // Rewrite fields to target the correct associated miner
    data.minerId = miner.id;
    data.minerName = miner.name;
    data.zone = data.zone || miner.zone;

    switch (data.type) {
      case 'location':
        this.updateMinerLocation(data);
        break;
      case 'alert':
        this.createAlertFromWatch(data);
        break;
      case 'status':
        this.updateMinerStatus(data);
        if (data.status !== 'danger') {
          this.checkPreventiveAnomalies(data.minerId, data.heartRate, data.seismicHz);
        }
        break;
      case 'health':
        this.processHealthData(data);
        break;
      case 'ack':
        console.log(`ACK reçu de ${data.minerId}: ${data.commandId}`);
        break;
      default:
        console.warn('Type de données LoRa inconnu:', data.type);
    }
  }

  updateMinerLocation(data) {
    // Stocker les données complètes du mineur
    const existing = this.miners.get(data.minerId) || {};
    
    // Si lat et lng sont fournis (par la Gateway LoRa ou HTTP), on écrase x, y et zone
    let x = data.x;
    let y = data.y;
    let zone = data.zone;

    if (data.lat !== undefined && data.lng !== undefined) {
      const mapData = gpsToLocalMap(data.lat, data.lng);
      x = mapData.x;
      y = mapData.y;
      zone = mapData.zone;
    }

    const trajectory = existing.trajectory || [];
    const newPos = { x: x, y: y, timestamp: Date.now() };
    const updatedTrajectory = [...trajectory, newPos].slice(-100);

    const minerData = {
      ...existing,
      id: data.minerId,
      name: data.name || existing.name,
      position: newPos,
      trajectory: updatedTrajectory,
      zone: zone,
      battery: data.battery !== undefined ? data.battery : existing.battery,
      rssi: data.rssi !== undefined ? data.rssi : existing.rssi,
      connectionType: data.connectionType || existing.connectionType,
      temperature: data.temperature !== undefined ? data.temperature : existing.temperature,
      steps: data.steps !== undefined ? data.steps : existing.steps,
      motion: data.motion || existing.motion,
      lastUpdate: Date.now()
    };
    this.miners.set(data.minerId, minerData);

    // Enregistrer l'historique GPS en base de données
    try {
      const db = getDb();
      db.prepare('INSERT INTO gps_track_logs (miner_id, x, y, zone) VALUES (?, ?, ?, ?)')
        .run(data.minerId, x, y, zone);
      // Limiter à 100 points historiques par mineur
      db.prepare('DELETE FROM gps_track_logs WHERE id NOT IN (SELECT id FROM gps_track_logs WHERE miner_id = ? ORDER BY created_at DESC LIMIT 100) AND miner_id = ?')
        .run(data.minerId, data.minerId);
    } catch (e) {
      console.warn("Erreur sauvegarde historique GPS:", e);
    }
    
    // Diffuser la mise à jour de localisation
    this.websocketManager.broadcastLocationUpdate({
      type: 'location-update',
      minerId: data.minerId,
      name: minerData.name,
      position: minerData.position,
      zone: minerData.zone,
      battery: minerData.battery,
      rssi: minerData.rssi,
      connectionType: minerData.connectionType,
      is_in_service: minerData.is_in_service,
      is_underground: minerData.is_underground,
      temperature: minerData.temperature,
      steps: minerData.steps,
      motion: minerData.motion,
      timestamp: Date.now()
    });
  }

  createAlertFromWatch(data) {
    const miner = this.miners.get(data.minerId) || {};
    const zone = data.zone || miner.zone || 'ZONE A';
    
    let env = null;
    try {
      const db = getDb();
      env = db.prepare('SELECT * FROM env_conditions WHERE zone=?').get(zone);
    } catch (e) {
      console.warn("Could not query env_conditions for prediction:", e);
    }

    const hr = data.heartRate || miner.heartRate || 72;
    const seismic = data.seismicHz || miner.seismicHz || 0;
    
    const predictedCause = predictIncidentCause(hr, seismic, env);

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      minerId: data.minerId,
      minerName: data.minerName || data.minerId,
      type: data.alertType,
      severity: data.severity,
      message: data.message,
      zone: zone,
      timestamp: Date.now(),
      resolved: false,
      predictedCause: predictedCause
    };

    /*
    if (data.alertType === 'emergency') {
      alert.message = `Urgence signalée - Cause prédite: ${predictedCause}`;
    }
    */

    this.alerts.push(alert);
    this.websocketManager.broadcastAlert(alert);
  }

  updateMinerStatus(data) {
    const miner = this.miners.get(data.minerId);
    if (miner) {
      miner.status = data.status;
      if (data.heartRate !== undefined) {
        miner.heartRate = data.heartRate;
      }
      if (data.toxicGasLevel !== undefined) {
        miner.toxicGasLevel = data.toxicGasLevel;
      }
      if (data.seismicHz !== undefined) {
        miner.seismicHz = data.seismicHz;
      }
      if (data.connectionType !== undefined) {
        miner.connectionType = data.connectionType;
      }
      miner.lastUpdate = Date.now();
      
      this.websocketManager.broadcast('miner-status-update', {
        minerId: data.minerId,
        status: data.status,
        heartRate: data.heartRate,
        toxicGasLevel: data.toxicGasLevel,
        seismicHz: data.seismicHz,
        connectionType: data.connectionType
      });
    }
  }

  processHealthData(data) {
    const miner = this.miners.get(data.minerId);
    if (miner && data.healthData) {
      miner.heartRate = data.healthData.heartRate;
    }
    this.websocketManager.broadcast('health-update', {
      minerId: data.minerId,
      healthData: data.healthData
    });
  }

  checkPreventiveAnomalies(minerId, heartRate, seismicHz) {
    // Le superviseur a demandé à ce que SEULES les alertes provenant de l'application galaxy (SOS) soient générées.
    // Désactivation complète des alertes préventives générées automatiquement par le backend.
    return;
    
    const now = Date.now();
    const lastAlertTime = this.lastPreventiveAlert.get(minerId) || 0;
    
    // Throttling : maximum 1 alerte préventive toutes les 60 secondes par mineur
    if (now - lastAlertTime < 60000) {
      return;
    }

    const miner = this.miners.get(minerId);
    if (!miner) return;

    const zone = miner.zone || 'ZONE A';
    
    let env = null;
    try {
      const db = getDb();
      env = db.prepare('SELECT * FROM env_conditions WHERE zone=?').get(zone);
    } catch (e) {
      console.warn("Could not query env_conditions for anomaly detection:", e);
    }

    const hr = heartRate || miner.heartRate || 72;
    const seismic = seismicHz || miner.seismicHz || 0;

    let warningMessage = null;
    let predictedCause = null;

    // 1. Risque d'Asphyxie imminent : CO2 élevé (> 450ppm) ET rythme cardiaque élevé (> 100bpm)
    if (env && env.co2_level && env.co2_level > 450 && hr > 100) {
      warningMessage = `Rythme cardiaque élevé (${hr} bpm) détecté dans un environnement à fort taux de CO₂ (${env.co2_level} ppm).`;
      predictedCause = `Risque d'Asphyxie imminent / Présence de gaz toxiques`;
    }
    // 2. Risque de Coup de chaleur imminent : Température élevée (> 32°C) ET rythme cardiaque élevé (> 105bpm)
    else if (env && env.temperature && env.temperature > 32 && hr > 105) {
      warningMessage = `Rythme cardiaque élevé (${hr} bpm) détecté sous une température de zone excessive (${env.temperature.toFixed(1)}°C).`;
      predictedCause = `Risque de Coup de chaleur imminent / Déshydratation`;
    }
    // 3. Risque d'Éboulement imminent : secousses précurseurs détectées (vibrations montre entre 35Hz et 50Hz)
    else if (seismic >= 35 && seismic <= 50) {
      warningMessage = `Vibrations sismiques anormales (${seismic} Hz) enregistrées par le capteur de la montre.`;
      predictedCause = `Risque d'Éboulement imminent (Secousses précurseurs détectées)`;
    }
    // 4. Anomalie Cardiaque isolée : pouls extrême hors effort (> 115bpm ou < 45bpm)
    else if (hr > 115 || (hr > 0 && hr < 45)) {
      warningMessage = `Rythme cardiaque anormal détecté (${hr} bpm) en dehors d'une activité SOS.`;
      predictedCause = `Anomalie Cardiaque détectée (Malaise ou Tachycardie)`;
    }

    if (warningMessage && predictedCause) {
      this.lastPreventiveAlert.set(minerId, now);

      const alert = {
        id: `alert-prev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        minerId: minerId,
        minerName: miner.name || minerId,
        type: 'preventive_warning',
        severity: 'medium', // Toast orange
        message: `[Alerte Préventive] ${warningMessage}`,
        zone: zone,
        timestamp: now,
        resolved: false,
        predictedCause: predictedCause
      };

      this.alerts.push(alert);
      this.websocketManager.broadcastAlert(alert);

      // Met à jour le statut du mineur en warning si pas déjà en danger
      if (miner.status !== 'danger') {
        this.updateMinerStatus({
          minerId: minerId,
          status: 'warning',
          heartRate: hr
        });
      }
    }
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
