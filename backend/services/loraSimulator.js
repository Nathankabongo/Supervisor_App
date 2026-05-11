import { WATCH_PROTOCOL } from './watchProtocol.js';
import { getDb } from './database.js';

// Positions des zones sur la carte pour simulation réaliste
const ZONE_CENTERS = {
  'ZONE A': { x: 165, y: 130, radius: 80 },
  'ZONE B': { x: 425, y: 130, radius: 80 },
  'ZONE C': { x: 675, y: 130, radius: 80 },
  'ZONE D': { x: 165, y: 360, radius: 80 },
  'ZONE E': { x: 425, y: 400, radius: 80 },
  'ZONE F': { x: 675, y: 400, radius: 80 }
};

const ZONE_NAMES = Object.keys(ZONE_CENTERS);

// Mineurs simulés avec leurs montres
const SIMULATED_MINERS = [
  { id: 'MIN-001', name: 'Amadou Diallo', zone: 'ZONE A', status: 'safe' },
  { id: 'MIN-002', name: 'Ibrahim Sow', zone: 'ZONE A', status: 'safe' },
  { id: 'MIN-003', name: 'Mamadou Keita', zone: 'ZONE B', status: 'safe' },
  { id: 'MIN-004', name: 'Ousmane Traoré', zone: 'ZONE B', status: 'warning' },
  { id: 'MIN-005', name: 'Cheikh Diop', zone: 'ZONE C', status: 'safe' },
  { id: 'MIN-006', name: 'Abdoulaye Ndiaye', zone: 'ZONE C', status: 'safe' },
  { id: 'MIN-007', name: 'Moussa Ba', zone: 'ZONE D', status: 'safe' },
  { id: 'MIN-008', name: 'Samba Fall', zone: 'ZONE D', status: 'danger' },
  { id: 'MIN-009', name: 'Boubacar Sy', zone: 'ZONE E', status: 'safe' },
  { id: 'MIN-010', name: 'Lamine Gueye', zone: 'ZONE E', status: 'warning' },
  { id: 'MIN-011', name: 'Pape Sarr', zone: 'ZONE F', status: 'safe' },
  { id: 'MIN-012', name: 'Aliou Mbaye', zone: 'ZONE F', status: 'safe' }
];

export class LoRaSimulator {
  constructor(onData) {
    this.onData = onData;
    this.running = false;
    this.timers = [];
    this.minerStates = new Map();
    this.onTraceEvent = null; // Callback pour traçabilité
    
    // Initialiser les états des mineurs
    SIMULATED_MINERS.forEach(miner => {
      const center = ZONE_CENTERS[miner.zone];
      this.minerStates.set(miner.id, {
        ...miner,
        x: center.x + (Math.random() - 0.5) * center.radius,
        y: center.y + (Math.random() - 0.5) * center.radius,
        heartRate: 65 + Math.floor(Math.random() * 25),
        temperature: 36.2 + Math.random() * 0.8,
        battery: 70 + Math.floor(Math.random() * 30),
        steps: Math.floor(Math.random() * 3000),
        targetX: 0,
        targetY: 0,
        moveTimer: 0
      });
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('Simulateur LoRa démarré (mode sans montre physique)');

    // Envoyer les positions toutes les 3 secondes
    this.timers.push(setInterval(() => {
      this.sendLocationUpdates();
    }, 3000));

    // Envoyer le statut toutes les 15 secondes
    this.timers.push(setInterval(() => {
      this.sendStatusUpdates();
    }, 15000));

    // Envoyer les données de santé toutes les 30 secondes
    this.timers.push(setInterval(() => {
      this.sendHealthUpdates();
    }, 30000));

    // Déclencher des alertes aléatoires toutes les 45 secondes
    this.timers.push(setInterval(() => {
      this.maybeSendAlert();
    }, 45000));

    // Simuler le déplacement des mineurs toutes les 2 secondes
    this.timers.push(setInterval(() => {
      this.moveMiners();
    }, 2000));

    // Synchroniser les positions des mineurs en DB toutes les 10 secondes
    this.timers.push(setInterval(() => {
      this.syncMinersToDb();
    }, 10000));
  }

  stop() {
    this.running = false;
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    console.log('Simulateur LoRa arrêté');
  }

  moveMiners() {
    this.minerStates.forEach((state, minerId) => {
      const center = ZONE_CENTERS[state.zone];
      
      // Changer de zone aléatoirement (5% de chance)
      if (Math.random() < 0.05) {
        const oldZone = state.zone;
        const newZone = ZONE_NAMES[Math.floor(Math.random() * ZONE_NAMES.length)];
        state.zone = newZone;
        const newCenter = ZONE_CENTERS[newZone];
        state.targetX = newCenter.x + (Math.random() - 0.5) * newCenter.radius;
        state.targetY = newCenter.y + (Math.random() - 0.5) * newCenter.radius;

        // Enregistrer l'événement de traçabilité
        if (this.onTraceEvent && oldZone !== newZone) {
          this.onTraceEvent({
            minerId: minerId,
            minerName: state.name,
            eventType: 'zone_change',
            zone: newZone,
            gallery: `Galerie ${newZone.charAt(newZone.length - 1)}1`,
            details: `De ${oldZone} vers ${newZone}`,
          });
        }
      }

      // Définir une nouvelle cible si on est proche de l'ancienne
      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        state.targetX = center.x + (Math.random() - 0.5) * center.radius;
        state.targetY = center.y + (Math.random() - 0.5) * center.radius;
      } else {
        // Se déplacer vers la cible (mouvement fluide)
        const speed = Math.min(3, dist * 0.1);
        state.x += (dx / dist) * speed;
        state.y += (dy / dist) * speed;
      }

      // Limiter aux bornes de la carte
      state.x = Math.max(20, Math.min(980, state.x));
      state.y = Math.max(20, Math.min(480, state.y));

      // Mettre à jour les pas
      state.steps += Math.floor(Math.random() * 10);
    });
  }

  sendLocationUpdates() {
    this.minerStates.forEach((state) => {
      const locationData = {
        type: WATCH_PROTOCOL.MESSAGE_TYPES.LOCATION,
        minerId: state.id,
        name: state.name,
        x: Math.round(state.x * 10) / 10,
        y: Math.round(state.y * 10) / 10,
        zone: state.zone,
        battery: state.battery,
        rssi: -(50 + Math.floor(Math.random() * 30))
      };

      if (this.onData) this.onData(locationData);
    });
  }

  sendStatusUpdates() {
    this.minerStates.forEach((state) => {
      // Varier le statut aléatoirement
      const rand = Math.random();
      if (state.id === 'MIN-008') {
        state.status = 'danger'; // Toujours en danger pour la démo
      } else if (rand < 0.05) {
        state.status = 'warning';
      } else if (rand < 0.02) {
        state.status = 'danger';
      } else {
        state.status = 'safe';
      }

      // Varier les signes vitaux
      state.heartRate = Math.max(50, Math.min(130, state.heartRate + Math.floor(Math.random() * 10 - 5)));
      state.temperature = Math.max(36.0, Math.min(39.0, state.temperature + (Math.random() - 0.5) * 0.3));

      const statusData = {
        type: WATCH_PROTOCOL.MESSAGE_TYPES.STATUS,
        minerId: state.id,
        status: state.status,
        heartRate: state.heartRate,
        temperature: Math.round(state.temperature * 10) / 10,
        steps: state.steps
      };

      if (this.onData) this.onData(statusData);
    });
  }

  sendHealthUpdates() {
    this.minerStates.forEach((state) => {
      const healthData = {
        type: WATCH_PROTOCOL.MESSAGE_TYPES.HEALTH,
        minerId: state.id,
        heartRate: state.heartRate,
        temperature: Math.round(state.temperature * 10) / 10,
        oxygenLevel: 94 + Math.floor(Math.random() * 6),
        bloodPressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`
      };

      if (this.onData) this.onData(healthData);
    });
  }

  maybeSendAlert() {
    // 20% de chance de générer une alerte
    if (Math.random() > 0.2) return;

    const alertMiners = Array.from(this.minerStates.values()).filter(m => m.status !== 'safe');
    if (alertMiners.length === 0) return;

    const miner = alertMiners[Math.floor(Math.random() * alertMiners.length)];
    const alertTypes = WATCH_PROTOCOL.ALERT_TYPES;
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];

    const messages = {
      fall: 'Chute détectée',
      immobility: 'Immobilité prolongée',
      gas: 'Gaz détecté dans la zone',
      emergency: 'Bouton SOS activé'
    };

    const alertData = {
      type: WATCH_PROTOCOL.MESSAGE_TYPES.ALERT,
      minerId: miner.id,
      minerName: miner.name,
      alertType: alertType,
      severity: miner.status === 'danger' ? 'high' : 'medium',
      message: messages[alertType],
      zone: miner.zone
    };

    if (this.onData) this.onData(alertData);
    if (this.onTraceEvent) {
      this.onTraceEvent({
        minerId: miner.id,
        minerName: miner.name,
        eventType: 'alert',
        zone: miner.zone,
        gallery: `Galerie ${miner.zone.charAt(miner.zone.length - 1)}1`,
        details: messages[alertType],
      });
    }
  }

  syncMinersToDb() {
    try {
      const db = getDb();
      const stmt = db.prepare('UPDATE miners SET zone=?,gallery=?,status=?,heart_rate=?,temperature=?,battery=?,x=?,y=?,last_update=datetime(\'now\') WHERE id=?');
      const tx = db.transaction(() => {
        this.minerStates.forEach((state) => {
          stmt.run(state.zone, `Galerie ${state.zone.charAt(state.zone.length-1)}1`, state.status, state.heartRate, Math.round(state.temperature*10)/10, state.battery, Math.round(state.x*10)/10, Math.round(state.y*10)/10, state.id);
        });
      });
      tx();
    } catch {}
  }
}
