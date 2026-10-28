import { getDb } from './database.js';
import { gpsToLocalMap } from '../utils/gps.js';
import { enqueueActivateSirenForZone } from './deviceCommandService.js';

const MAX_ALERTS = 500;
const MAX_NOTIFICATIONS = 200;
const ALERT_TTL = 24 * 60 * 60 * 1000; // 24h
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1h

/**
 * Cause affichée = type/message montre, enrichie seulement si la payload
 * contient des capteurs réels (pas de valeurs inventées / seed env).
 */
function resolvePredictedCause(data) {
  const alertType = data.alertType;
  const message = data.message;

  // Capteurs uniquement s'ils viennent de la montre (présents dans la payload)
  const hasHr = data.heartRate != null && data.heartRate !== '';
  const hasSeismic = data.seismicHz != null && data.seismicHz !== '';
  const hr = hasHr ? Number(data.heartRate) : null;
  const seismic = hasSeismic ? Number(data.seismicHz) : null;

  if (hasSeismic && seismic > 50) {
    return `Éboulement / Secousse sismique détectée (Vibrations montre: ${seismic}Hz)`;
  }
  if (hasHr && hr > 120) {
    return `Malaise cardiaque / Tachycardie (Rythme cardiaque: ${hr}bpm)`;
  }

  switch (alertType) {
    case 'fall':
      return message || 'Chute détectée par la montre';
    case 'emergency':
      return message || 'Bouton SOS activé';
    case 'immobility':
      return message || 'Immobilité prolongée détectée';
    case 'gas':
      return message || 'Gaz détecté par la montre';
    default:
      return message || null;
  }
}

export class RealTimeDataService {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.miners = new Map();
    this.alerts = [];
    this.notifications = [];
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
          const logs = db.prepare('SELECT x, y, latitude, longitude, created_at FROM gps_track_logs WHERE miner_id = ? ORDER BY created_at ASC LIMIT 100').all(m.id);
          trajectory = logs.map(l => ({
            x: l.x,
            y: l.y,
            lat: l.latitude,
            lng: l.longitude,
            latitude: l.latitude,
            longitude: l.longitude,
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
          zone: m.zone || '',
          gallery: m.gallery || '',
          photo: m.photo,
          account_status: m.account_status,
          watch_id: m.watch_id,
          status: m.status || 'safe',
          heartRate: m.heart_rate || 0,
          temperature: m.temperature,
          battery: m.battery,
          latitude: m.latitude ?? null,
          longitude: m.longitude ?? null,
          motion: m.motion || 'still',
          immobileSince: m.immobile_since ? new Date(m.immobile_since).getTime() : null,
          position: (m.x != null && m.y != null)
            ? { x: m.x, y: m.y, lat: m.latitude, lng: m.longitude, latitude: m.latitude, longitude: m.longitude, timestamp: Date.now() }
            : { x: 0, y: 0, lat: null, lng: null, timestamp: 0 },
          // Trajectoire = logs GPS montre uniquement (pas de point inventé)
          trajectory: trajectory,
          is_in_service: m.is_in_service === 1,
          is_underground: m.is_underground === 1,
          entry_time: m.entry_time,
          exit_time: m.exit_time,
          activityLevel: 0
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

  clearAlerts() {
    this.alerts = [];
    this.websocketManager.broadcast('alerts-cleared', {});
  }

  deleteAlert(alertId) {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
    this.websocketManager.broadcast('alert-deleted', { alertId });
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

    // Find the miner by id, matricule (workerId) or by watch_id
    let miner = null;
    if (watchId) {
      miner = this.miners.get(watchId) || null;
      // First try to find by matricule (workerId from firmware)
      if (!miner) {
        miner = Array.from(this.miners.values()).find(m => m.matricule === watchId);
      }
      // If not found, try by watch_id (for LoRa data)
      if (!miner) {
        miner = Array.from(this.miners.values()).find(m => m.watch_id === watchId);
      }
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
        return this.createAlertFromWatch(data);
      case 'status':
        this.updateMinerStatus(data);
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
    const existing = this.miners.get(data.minerId) || {};
    
    // Extraction GPS réelle (priorité aux coordonnées de la montre)
    const rawLat = data.lat !== undefined ? data.lat : (data.latitude !== undefined ? data.latitude : existing.latitude);
    const rawLng = data.lng !== undefined ? data.lng : (data.longitude !== undefined ? data.longitude : existing.longitude);
    const hasGps = rawLat !== null && rawLng !== null && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng)) && (Number(rawLat) !== 0 || Number(rawLng) !== 0);
    const lat = hasGps ? Number(rawLat) : (existing.latitude ?? null);
    const lng = hasGps ? Number(rawLng) : (existing.longitude ?? null);

    let x = data.x ?? existing.position?.x ?? 500;
    let y = data.y ?? existing.position?.y ?? 250;
    let zone = data.zone || existing.zone || 'ZONE B';

    if (hasGps) {
      const mapData = gpsToLocalMap(lat, lng);
      x = mapData.x;
      y = mapData.y;
      zone = mapData.zone;
    }

    const trajectory = existing.trajectory || [];
    const newPos = { 
      x: x, 
      y: y, 
      lat: lat, 
      lng: lng, 
      latitude: lat, 
      longitude: lng, 
      timestamp: Date.now() 
    };
    const updatedTrajectory = [...trajectory, newPos].slice(-100);

    const minerData = {
      ...existing,
      id: data.minerId,
      name: data.name || existing.name,
      position: newPos,
      trajectory: updatedTrajectory,
      zone: zone,
      latitude: lat,
      longitude: lng,
      battery: data.battery !== undefined ? data.battery : existing.battery,
      rssi: data.rssi !== undefined ? data.rssi : existing.rssi,
      connectionType: data.connectionType || existing.connectionType,
      temperature: data.temperature !== undefined ? data.temperature : existing.temperature,
      steps: data.steps !== undefined ? data.steps : existing.steps,
      motion: data.motion || existing.motion || 'still',
      lastUpdate: Date.now()
    };
    this.miners.set(data.minerId, minerData);

    // Enregistrer l'historique GPS en base de données
    try {
      const db = getDb();
      db.prepare('INSERT INTO gps_track_logs (miner_id, x, y, zone, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)')
        .run(data.minerId, x, y, zone, lat, lng);
      db.prepare('DELETE FROM gps_track_logs WHERE id NOT IN (SELECT id FROM gps_track_logs WHERE miner_id = ? ORDER BY created_at DESC LIMIT 100) AND miner_id = ?')
        .run(data.minerId, data.minerId);
    } catch (e) {
      console.warn("Erreur sauvegarde historique GPS:", e);
    }
    
    // Diffuser la mise à jour de localisation avec coordonnées GPS réelles
    this.websocketManager.broadcastLocationUpdate({
      type: 'location-update',
      minerId: data.minerId,
      name: minerData.name,
      position: minerData.position,
      zone: minerData.zone,
      latitude: minerData.latitude,
      longitude: minerData.longitude,
      lat: minerData.latitude,
      lng: minerData.longitude,
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
    const zone = data.zone || miner.zone || '';
    const predictedCause = resolvePredictedCause(data);

    const timestamp = Date.now();
    const createdAt = new Date(timestamp).toISOString();
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertId: null,
      minerId: data.minerId,
      minerName: data.minerName || miner.name || data.minerId,
      type: data.alertType,
      severity: data.severity || 'high',
      message: data.message,
      zone: zone,
      timestamp,
      createdAt,
      resolved: false,
      predictedCause: predictedCause,
      source: 'LILYGO_INCIDENT',
      deviceId: null,
      sensorType: null,
      sensorRaw: null,
      threshold: null,
      siren: true,
      status: 'ACTIVE',
      clientEventId: null,
    };
    alert.alertId = alert.id;

    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO alerts (
           id, minerId, minerName, type, severity, message, zone, timestamp, resolved, predictedCause,
           source, device_id, sensor_type, sensor_raw, threshold, siren, client_event_id, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        alert.id,
        alert.minerId,
        alert.minerName,
        alert.type,
        alert.severity,
        alert.message,
        alert.zone,
        alert.timestamp,
        alert.predictedCause,
        alert.source,
        alert.deviceId,
        alert.sensorType,
        alert.sensorRaw,
        alert.threshold,
        1,
        alert.clientEventId,
        alert.status
      );
    } catch (e) {
      console.warn('Could not persist alert to DB:', e);
    }

    this.alerts.push(alert);
    console.log(`[T0] alert created id=${alert.id} zone=${zone} source=LILYGO_INCIDENT createdAt=${createdAt}`);
    enqueueActivateSirenForZone(zone, alert);
    this.emitAlert(alert);
    return alert;
  }

  emitAlert(alert) {
    this.websocketManager.broadcastAlert(alert);
    console.log(`[new-alert] emitted id=${alert.id} createdAt=${alert.createdAt || new Date(alert.timestamp).toISOString()}`);
  }

  /** Incident PC crise — même table alerts + Socket.IO, pas une 2e architecture. */
  createSystemAlert({ zone, message, type = 'emergency' }) {
    const timestamp = Date.now();
    const createdAt = new Date(timestamp).toISOString();
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      minerId: null,
      minerName: null,
      type,
      severity: 'high',
      message: message || "Plan d'évacuation activé",
      zone: zone || 'ZONE B',
      timestamp,
      createdAt,
      resolved: false,
      predictedCause: message || null,
      source: 'SYSTEM',
      deviceId: null,
      sensorType: null,
      sensorRaw: null,
      threshold: null,
      siren: true,
      status: 'ACTIVE',
      clientEventId: null,
    };
    alert.alertId = alert.id;

    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO alerts (
           id, minerId, minerName, type, severity, message, zone, timestamp, resolved, predictedCause,
           source, device_id, sensor_type, sensor_raw, threshold, siren, client_event_id, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        alert.id,
        alert.minerId,
        alert.minerName,
        alert.type,
        alert.severity,
        alert.message,
        alert.zone,
        alert.timestamp,
        alert.predictedCause,
        alert.source,
        alert.deviceId,
        alert.sensorType,
        alert.sensorRaw,
        alert.threshold,
        1,
        alert.clientEventId,
        alert.status
      );
    } catch (e) {
      console.warn('Could not persist system alert:', e);
    }

    this.alerts.push(alert);
    console.log(`[T0] alert created id=${alert.id} zone=${alert.zone} source=SYSTEM createdAt=${createdAt}`);
    return alert;
  }

  /**
   * Incident ESP32 / capteur de zone. minerId nullable.
   * Idempotence: clientEventId unique.
   */
  createAlertFromDevice(payload) {
    const db = getDb();
    const clientEventId = payload.clientEventId;
    if (!clientEventId) {
      return { error: 'clientEventId requis', status: 400 };
    }
    const existing = db.prepare('SELECT * FROM alerts WHERE client_event_id = ?').get(clientEventId);
    if (existing) {
      return { created: false, alert: this.mapDbAlert(existing) };
    }

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      minerId: null,
      minerName: null,
      type: payload.type || 'gas',
      severity: payload.severity || 'high',
      message: payload.message || 'Seuil prototype capteur dépassé',
      zone: payload.zone,
      timestamp: Date.now(),
      resolved: false,
      predictedCause: payload.message || null,
      source: payload.source || 'GAS_SENSOR',
      deviceId: payload.deviceId || null,
      sensorType: payload.sensorType || 'MQ2',
      sensorRaw: payload.sensorRaw ?? null,
      threshold: payload.threshold ?? null,
      siren: payload.siren !== false,
      status: 'ACTIVE',
      clientEventId: clientEventId || null,
    };

    try {
      db.prepare(
        `INSERT INTO alerts (
           id, minerId, minerName, type, severity, message, zone, timestamp, resolved, predictedCause,
           source, device_id, sensor_type, sensor_raw, threshold, siren, client_event_id, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        alert.id,
        alert.minerId,
        alert.minerName,
        alert.type,
        alert.severity,
        alert.message,
        alert.zone,
        alert.timestamp,
        alert.predictedCause,
        alert.source,
        alert.deviceId,
        alert.sensorType,
        alert.sensorRaw,
        alert.threshold,
        alert.siren ? 1 : 0,
        alert.clientEventId,
        alert.status
      );
    } catch (e) {
      if (String(e.message || '').includes('UNIQUE')) {
        const existing = db.prepare('SELECT * FROM alerts WHERE client_event_id = ?').get(clientEventId);
        return { created: false, alert: this.mapDbAlert(existing) };
      }
      throw e;
    }

    this.alerts.push(alert);
    this.websocketManager.broadcastAlert(alert);
    if (alert.siren) {
      enqueueActivateSirenForZone(alert.zone, alert);
    }
    return { created: true, alert };
  }

  mapDbAlert(a) {
    if (!a) return null;
    return {
      id: a.id,
      minerId: a.minerId ?? null,
      minerName: a.minerName ?? null,
      type: a.type,
      severity: a.severity,
      message: a.message,
      zone: a.zone,
      timestamp: a.timestamp,
      createdAt: a.timestamp ? new Date(Number(a.timestamp)).toISOString() : null,
      resolved: a.resolved === 1 || a.resolved === true,
      predictedCause: a.predictedCause,
      source: a.source || 'LILYGO_INCIDENT',
      deviceId: a.device_id || a.deviceId || null,
      sensorType: a.sensor_type || a.sensorType || null,
      sensorRaw: a.sensor_raw ?? a.sensorRaw ?? null,
      threshold: a.threshold ?? null,
      siren: a.siren === 1 || a.siren === true,
      status: a.status || (a.resolved === 1 ? 'RESOLVED' : 'ACTIVE'),
      clientEventId: a.client_event_id || a.clientEventId || null,
    };
  }

  updateMinerStatus(data) {
    const miner = this.miners.get(data.minerId);
    if (miner) {
      miner.status = data.status;
      if (data.heartRate !== undefined) {
        miner.heartRate = data.heartRate;
      }
      if (data.motion !== undefined) {
        miner.motion = data.motion;
      }
      if (data.temperature !== undefined) {
        miner.temperature = data.temperature;
      }
      if (data.steps !== undefined) {
        miner.steps = data.steps;
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
        motion: data.motion,
        temperature: data.temperature,
        steps: data.steps,
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

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
