import express from 'express';
import { getDb } from '../services/database.js';
import { io } from '../server.js';
import { gpsToLocalMap } from '../utils/gps.js';

const router = express.Router();

let realTimeDataService = null;

// Durée en secondes avant de déclencher l'alerte d'immobilité (60s par défaut)
const IMMOBILITY_THRESHOLD_SECONDS = 60;

export function setWatchReferences(rt) {
  realTimeDataService = rt;
}

router.post('/data', (req, res) => {
    // console.log('Data:', req.body);
    io.emit('watch-raw-data', { endpoint: '/api/watch/data', payload: req.body });
    
    if (realTimeDataService) {
        const data = req.body || {};
        const matricule = data.workerId ? data.workerId.trim().toUpperCase() : '';
        const db = getDb();

        // Trouver le mineur associé par matricule (workerId transmis par la montre)
        const miner = db.prepare('SELECT * FROM miners WHERE matricule = ?').get(matricule);
        if (miner) {
            // Mettre à jour le statut de la montre
            if (miner.watch_id) {
                db.prepare("UPDATE watches SET status = 'assigned', last_seen = datetime('now') WHERE id = ?").run(miner.watch_id);
            }

            // Gestion du début de quart si le mineur n'était pas en service
            if (!miner.is_in_service) {
                db.prepare("UPDATE miners SET is_in_service = 1, status = 'safe', last_update = datetime('now') WHERE id = ?")
                  .run(miner.id);

                const trId = `TR-${String(Date.now())}`;
                db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
                  .run(trId, miner.id, miner.name, 'shift_start', miner.zone || 'ZONE B', 'Début de quart de travail (Montre allumée)');

                const memoryMiner = realTimeDataService.miners.get(miner.id);
                if (memoryMiner) {
                    memoryMiner.is_in_service = true;
                    memoryMiner.status = 'safe';
                }
            }

            // Extraction robuste des coordonnées GPS réelles transmises par la montre
            const rawLat = data.lat !== undefined ? data.lat : (data.latitude !== undefined ? data.latitude : null);
            const rawLng = data.lng !== undefined ? data.lng : (data.lon !== undefined ? data.lon : (data.longitude !== undefined ? data.longitude : null));
            const hasGps = rawLat !== null && rawLng !== null && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng)) && (Number(rawLat) !== 0 || Number(rawLng) !== 0);
            const lat = hasGps ? Number(rawLat) : (miner.latitude ?? null);
            const lng = hasGps ? Number(rawLng) : (miner.longitude ?? null);

            // Calcul du mapping local SVG (1000x500) et détection de la zone
            const mapData = gpsToLocalMap(lat, lng);
            const zone = hasGps ? mapData.zone : (miner.zone || mapData.zone || 'ZONE B');
            const x = hasGps ? mapData.x : (miner.x ?? mapData.x ?? 500);
            const y = hasGps ? mapData.y : (miner.y ?? mapData.y ?? 250);

            // Log de changement de zone si applicable
            const oldZone = miner.zone;
            if (oldZone && oldZone !== zone && miner.is_underground) {
                const trId = `TR-${String(Date.now())}`;
                db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
                  .run(trId, miner.id, miner.name, 'zone_change', zone, `Passage de ${oldZone} à ${zone}`);
            }

            // Gestion du mouvement et de l'immobilité
            const motion = (data.motion || 'still').toLowerCase();
            const memoryMiner = realTimeDataService.miners.get(miner.id);
            const now = Date.now();

            let immobileSince = memoryMiner?.immobileSince || (miner.immobile_since ? new Date(miner.immobile_since).getTime() : null);

            if (motion === 'still') {
                if (!immobileSince) {
                    immobileSince = now;
                    if (memoryMiner) memoryMiner.immobileSince = now;
                    db.prepare("UPDATE miners SET immobile_since = datetime('now') WHERE id = ?").run(miner.id);
                } else {
                    const immobileDurationSec = Math.round((now - immobileSince) / 1000);
                    if (immobileDurationSec >= IMMOBILITY_THRESHOLD_SECONDS) {
                        // Vérifier si une alerte d'immobilité non résolue existe déjà pour ce mineur
                        const alreadyAlerted = realTimeDataService.getUnresolvedAlerts()
                            .some(a => a.minerId === miner.id && a.type === 'immobility');

                        if (!alreadyAlerted) {
                            const minutes = Math.max(1, Math.round(immobileDurationSec / 60));
                            const severity = immobileDurationSec >= 180 ? 'high' : 'medium';
                            const alertMsg = `Immobilité prolongée détectée (${minutes} min sans mouvement)`;

                            console.log(`⚠️ ALERTE IMMOBILITÉ: ${miner.name} (${miner.id}) immobile depuis ${immobileDurationSec}s`);

                            db.prepare("UPDATE miners SET status = 'warning', last_update = datetime('now') WHERE id = ?")
                              .run(miner.id);

                            const trId = `TR-${String(now)}`;
                            db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
                              .run(trId, miner.id, miner.name, 'alert', zone, alertMsg);

                            realTimeDataService.processLoRaData({
                                type: 'alert',
                                minerId: miner.id,
                                minerName: miner.name,
                                alertType: 'immobility',
                                severity: severity,
                                message: alertMsg,
                                zone: zone,
                                connectionType: 'wifi',
                                lat: lat,
                                lng: lng
                            });
                        }
                    }
                }
            } else if (motion === 'walking' || motion === 'running') {
                // Le travailleur bouge à nouveau : réinitialiser le chronomètre d'immobilité
                if (immobileSince) {
                    if (memoryMiner) memoryMiner.immobileSince = null;
                    db.prepare("UPDATE miners SET immobile_since = NULL WHERE id = ?").run(miner.id);
                }
            }

            // Mise à jour complète de la table miners avec les coordonnées GPS réelles et l'état de mouvement
            db.prepare(`
                UPDATE miners SET 
                    zone = ?, 
                    battery = ?, 
                    x = ?, 
                    y = ?, 
                    latitude = ?, 
                    longitude = ?, 
                    motion = ?, 
                    heart_rate = ?, 
                    temperature = ?, 
                    last_update = datetime('now') 
                WHERE id = ?
            `).run(
                zone, 
                data.battery ?? 100, 
                x, 
                y, 
                lat, 
                lng, 
                motion, 
                data.heartRate ?? 72, 
                data.temperature ?? 36.5, 
                miner.id
            );

            // Transmission au service temps réel
            realTimeDataService.processLoRaData({
                type: 'location',
                minerId: miner.id,
                x: x,
                y: y,
                lat: lat,
                lng: lng,
                latitude: lat,
                longitude: lng,
                battery: data.battery ?? 100,
                connectionType: 'wifi',
                zone: zone,
                motion: motion,
                steps: data.steps,
                temperature: data.temperature
            });

            realTimeDataService.processLoRaData({
                type: 'status',
                minerId: miner.id,
                status: miner.status || 'safe',
                temperature: data.temperature ?? 36.5,
                steps: data.steps,
                heartRate: data.heartRate ?? 72,
                motion: motion,
                connectionType: 'wifi'
            });

            return res.json({
                ok: true,
                workerName: miner.name,
                zone: zone,
                gps: hasGps ? { lat, lng } : null,
                motion: motion
            });
        } else {
            return res.json({
                ok: false,
                message: 'Mineur non trouvé avec ce matricule'
            });
        }
    }

    res.json({ ok: false, message: 'Service temps réel non disponible' });
});

router.post('/sos', (req, res) => {
    console.log('🆘 Alerte Montre (SOS / CHUTE / IMMOBILITÉ):', req.body);
    io.emit('watch-raw-data', { endpoint: '/api/watch/sos', payload: req.body });

    if (realTimeDataService) {
        const data = req.body || {};
        const matricule = data.workerId ? data.workerId.trim().toUpperCase() : '';
        
        const isImmobility = data.type === 'IMMOBILITY' || data.alertType === 'immobility' || data.type === 'STILL';
        const isFall = data.type === 'FALL' || data.alertType === 'fall';
        const type = isImmobility ? 'immobility' : (isFall ? 'fall' : 'emergency');
        const msg = isImmobility
          ? (data.message || 'Immobilité prolongée confirmée par la montre')
          : (isFall ? 'Chute détectée (WiFi)' : 'Bouton SOS activé (WiFi)');

        const db = getDb();
        const miner = db.prepare('SELECT * FROM miners WHERE matricule = ?').get(matricule);
        
        if (miner) {
            const rawLat = data.lat !== undefined ? data.lat : (data.latitude !== undefined ? data.latitude : null);
            const rawLng = data.lng !== undefined ? data.lng : (data.lon !== undefined ? data.lon : (data.longitude !== undefined ? data.longitude : null));
            const hasGps = rawLat !== null && rawLng !== null && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng)) && (Number(rawLat) !== 0 || Number(rawLng) !== 0);
            const lat = hasGps ? Number(rawLat) : (miner.latitude ?? null);
            const lng = hasGps ? Number(rawLng) : (miner.longitude ?? null);

            const mapData = gpsToLocalMap(lat, lng);
            const zone = hasGps
              ? (mapData.zone || miner.zone || 'ZONE B')
              : (miner.zone || mapData.zone || 'ZONE B');
            const x = hasGps ? mapData.x : (miner.x ?? mapData.x ?? 500);
            const y = hasGps ? mapData.y : (miner.y ?? mapData.y ?? 250);
            
            const newStatus = isImmobility ? 'warning' : 'danger';
            db.prepare('UPDATE miners SET status=?, x=?, y=?, latitude=?, longitude=?, last_update=datetime(\'now\') WHERE id=?')
              .run(newStatus, x, y, lat, lng, miner.id);
            
            // Trace event
            const trId = `TR-${String(Date.now())}`;
            db.prepare('INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)')
              .run(trId, miner.id, miner.name, 'alert', zone, msg);

            // Création d'alerte (DB + broadcast)
            const alert = realTimeDataService.processLoRaData({
                type: 'alert',
                minerId: miner.id,
                minerName: miner.name,
                alertType: type,
                severity: isImmobility ? 'medium' : 'high',
                message: msg,
                connectionType: 'wifi',
                zone: zone,
                lat: lat,
                lng: lng,
                latitude: lat,
                longitude: lng,
                ...(data.heartRate != null ? { heartRate: data.heartRate } : {}),
                ...(data.seismicHz != null ? { seismicHz: data.seismicHz } : {}),
            });
            
            // Mise à jour de la position et du statut
            realTimeDataService.processLoRaData({
                type: 'location',
                minerId: miner.id,
                x: x,
                y: y,
                lat: lat,
                lng: lng,
                latitude: lat,
                longitude: lng,
                connectionType: 'wifi',
                zone: zone
            });

            realTimeDataService.processLoRaData({
                type: 'status',
                minerId: miner.id,
                status: newStatus,
                connectionType: 'wifi',
                ...(data.heartRate != null ? { heartRate: data.heartRate } : {}),
                ...(data.seismicHz != null ? { seismicHz: data.seismicHz } : {}),
            });

            return res.json({
                ok: true,
                minerName: miner.name,
                alertId: alert?.id || null,
                zone,
                gps: hasGps ? { lat, lng } : null,
                source: alert?.source || 'LILYGO_INCIDENT',
            });
        }
    }

    res.json({ ok: false, message: 'Montre non attribuée ou service non disponible' });
});

export default router;
