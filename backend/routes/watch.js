import express from 'express';
import { getDb } from '../services/database.js';
import { io } from '../server.js';

const router = express.Router();

let realTimeDataService = null;

import { gpsToLocalMap } from '../utils/gps.js';

export function setWatchReferences(rt) {
  realTimeDataService = rt;
}

router.post('/data', (req, res) => {
    // console.log('Data:', req.body);
    io.emit('watch-raw-data', { endpoint: '/api/watch/data', payload: req.body });
    
    if (realTimeDataService) {
        const data = req.body;
        const watchId = data.workerId ? data.workerId.trim().toUpperCase() : '';
        const db = getDb();
        
        // Auto register watch in database
        db.prepare('INSERT OR IGNORE INTO watches (id, status) VALUES (?, \'available\')').run(watchId);
        db.prepare('UPDATE watches SET last_seen = datetime(\'now\') WHERE id = ?').run(watchId);

        // Find associated miner
        const miner = db.prepare('SELECT * FROM miners WHERE watch_id = ? OR id = ?').get(watchId, watchId);
        if (miner) {
            // Check shift_start event and shift status
            if (!miner.is_in_service) {
                db.prepare("UPDATE miners SET is_in_service = 1, status = 'safe', last_update = datetime('now') WHERE id = ?")
                  .run(miner.id);
                
                // Create a shift start trace event
                const trId = `TR-${String(Date.now())}`;
                db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
                  .run(trId, miner.id, miner.name, 'shift_start', miner.zone || 'ZONE B', 'Début de quart de travail (Montre allumée)');

                // Update memory service
                const memoryMiner = realTimeDataService.miners.get(miner.id);
                if (memoryMiner) {
                    memoryMiner.is_in_service = true;
                    memoryMiner.status = 'safe';
                }
            }

            // Calculate zone and coordinates (x, y) from true GPS
            const mapData = gpsToLocalMap(data.lat, data.lng);
            const zone = mapData.zone;
            const x = mapData.x;
            const y = mapData.y;
            
            // Check if zone changed, log it if so!
            const oldZone = miner.zone;
            if (oldZone && oldZone !== zone && miner.is_underground) {
                const trId = `TR-${String(Date.now())}`;
                db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
                  .run(trId, miner.id, miner.name, 'zone_change', zone, `Passage de ${oldZone} à ${zone}`);
            }

            // Update DB miner operational fields
            db.prepare('UPDATE miners SET zone=?, battery=?, x=?, y=?, heart_rate=?, temperature=?, last_update=datetime(\'now\') WHERE id=?')
              .run(zone, data.battery || 100, x, y, data.heartRate || 72, data.temperature || 36.5, miner.id);

            // Forward to real-time service for state management
            realTimeDataService.processLoRaData({
                type: 'location',
                minerId: miner.id,
                x: x,
                y: y,
                battery: data.battery || 100,
                connectionType: 'wifi',
                zone: zone
            });
            
            realTimeDataService.processLoRaData({
                type: 'status',
                minerId: miner.id,
                status: miner.status || 'safe',
                temperature: data.temperature || 36.5,
                steps: data.steps,
                heartRate: data.heartRate || 72,
                connectionType: 'wifi'
            });

            return res.json({ 
                ok: true, 
                workerName: miner.name, 
                zone: zone 
            });
        } else {
            return res.json({ 
                ok: false, 
                message: 'Montre non attribuée' 
            });
        }
    }

    res.json({ ok: false, message: 'Service temps réel non disponible' });
});

router.post('/sos', (req, res) => {
    console.log('🆘 SOS!', req.body);
    io.emit('watch-raw-data', { endpoint: '/api/watch/sos', payload: req.body });
    
    if (realTimeDataService) {
        const data = req.body;
        const watchId = data.workerId ? data.workerId.trim().toUpperCase() : '';
        const type = data.type === 'FALL' ? 'fall' : 'emergency';
        const msg = data.type === 'FALL' ? 'Chute détectée (WiFi)' : 'Bouton SOS activé (WiFi)';
        
        const db = getDb();
        const miner = db.prepare('SELECT * FROM miners WHERE watch_id = ? OR id = ?').get(watchId, watchId);
        
        if (miner) {
            const mapData = gpsToLocalMap(data.lat, data.lng);
            const zone = mapData.zone;
            
            db.prepare('UPDATE miners SET status=?, last_update=datetime(\'now\') WHERE id=?')
              .run('danger', miner.id);
            
            // Trace event
            const trId = `TR-${String(Date.now())}`;
            db.prepare('INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)')
              .run(trId, miner.id, miner.name, 'alert', zone, msg);

            // Alert
            const alertId = `alert-${Date.now()}`;
            db.prepare('INSERT INTO alerts (id, minerId, minerName, type, severity, message, zone, timestamp, resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)')
              .run(alertId, miner.id, miner.name, type, 'high', msg, zone, Date.now());

            // Map to internal alert format
            realTimeDataService.processLoRaData({
                type: 'alert',
                minerId: miner.id,
                alertType: type,
                severity: 'high',
                message: msg,
                connectionType: 'wifi',
                zone: zone
            });
            
            // Update miner status to danger
            realTimeDataService.processLoRaData({
                type: 'status',
                minerId: miner.id,
                status: 'danger',
                connectionType: 'wifi'
            });

            return res.json({ ok: true, minerName: miner.name });
        }
    }

    res.json({ ok: false, message: 'Montre non attribuée ou service non disponible' });
});

export default router;
