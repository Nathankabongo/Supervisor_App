import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

let websocketManager = null;
let realTimeDataService = null;

export function setDataReferences(ws, rt) {
  websocketManager = ws;
  realTimeDataService = rt;
}

export function ackMessageInDb(messageId, minerId) {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(messageId);
  if (!msg) return;

  const readBy = JSON.parse(msg.read_by || '[]');
  if (!readBy.includes(minerId)) {
    readBy.push(minerId);
    db.prepare("UPDATE messages SET status='read', read_by=? WHERE id=?")
      .run(JSON.stringify(readBy), messageId);
    console.log(`✉️ Message ${messageId} marqué comme lu par ${minerId}`);
    
    // Broadcast message update to update the UI immediately
    if (websocketManager) {
      websocketManager.broadcast('message-update', {
        id: messageId,
        status: 'read',
        readBy
      });
    }
  }
}

// Map DB snake_case rows to frontend camelCase
function mapMessage(m) {
  return { ...m, targets: JSON.parse(m.targets||'[]'), deliveredTo: JSON.parse(m.delivered_to||'[]'), readBy: JSON.parse(m.read_by||'[]'), recipientMode: m.recipient_mode, createdAt: m.created_at };
}
function mapEvent(e) {
  return { ...e, minerId: e.miner_id, minerName: e.miner_name, eventType: e.event_type, createdAt: e.created_at };
}
function mapMiner(m) {
  if (!m) return null;
  return { 
    ...m, 
    heartRate: m.heart_rate, 
    currentZone: m.zone, 
    currentGallery: m.gallery, 
    lastUpdate: m.last_update,
    watchId: m.watch_id,
    isInService: m.is_in_service === 1,
    isUnderground: m.is_underground === 1,
    entryTime: m.entry_time,
    exitTime: m.exit_time,
    phone: m.phone,
    emergencyContact: m.emergency_contact,
    bloodGroup: m.blood_group,
    photo: m.photo,
    accountStatus: m.account_status
  };
}
function mapGateway(g) {
  return { ...g, lastHeartbeat: g.last_heartbeat };
}

// === MESSAGES ===

router.post('/messages/send', (req, res) => {
  const { content, type, recipientMode, targets } = req.body;
  if (!content || !type || !recipientMode) return res.status(400).json({ error: 'content, type et recipientMode requis' });
  if (!['text','voice'].includes(type)) return res.status(400).json({ error: 'Type invalide' });
  if (!['all','zone','miner'].includes(recipientMode)) return res.status(400).json({ error: 'recipientMode invalide' });
  if (recipientMode !== 'all' && (!targets || targets.length === 0)) return res.status(400).json({ error: 'targets requis' });

  const db = getDb();
  const id = `MSG-${String(Date.now())}`;
  const targetsJson = JSON.stringify(recipientMode === 'all' ? ['ALL'] : targets);

  db.prepare('INSERT INTO messages (id,content,type,recipient_mode,targets) VALUES (?,?,?,?,?)').run(id, content, type, recipientMode, targetsJson);
  console.log(`📨 Message envoyé: ${id} → ${recipientMode}`);

  // Broadcast to all connected watches via WebSocket
  if (websocketManager) {
    websocketManager.broadcast('watch-message', {
      id,
      content,
      type,
      recipientMode,
      targets: recipientMode === 'all' ? ['ALL'] : targets,
      createdAt: new Date().toISOString()
    });
  }

  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(id);
  res.json({ success: true, message: mapMessage(msg) });
});

router.get('/messages', (req, res) => {
  const db = getDb();
  const { limit=50, offset=0 } = req.query;
  const msgs = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
  const total = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
  res.json({ messages: msgs.map(mapMessage), total });
});

router.get('/messages/:id', (req, res) => {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message non trouvé' });
  res.json({ message: mapMessage(msg) });
});

// === ALERTES ===
router.get('/alerts', (req, res) => {
  const db = getDb();
  const dbAlerts = db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC').all();
  const alerts = dbAlerts.map(a => ({
    id: a.id, minerId: a.minerId, minerName: a.minerName, type: a.type,
    severity: a.severity, message: a.message, zone: a.zone,
    timestamp: a.timestamp, resolved: a.resolved === 1, predictedCause: a.predictedCause
  }));
  res.json({ alerts });
});

router.post('/alerts/:id/resolve', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE alerts SET resolved=1 WHERE id=?').run(req.params.id);
  if (realTimeDataService) {
    realTimeDataService.resolveAlert(req.params.id);
  }
  res.json({ success: true });
});

// === TRAÇABILITÉ ===

router.post('/trace/events', (req, res) => {
  const { minerId, minerName, eventType, zone, gallery, details, duration } = req.body;
  if (!minerId || !eventType || !zone) return res.status(400).json({ error: 'minerId, eventType et zone requis' });
  const valid = ['entry','exit','zone_change','alert','rest','equipment','shift_start','shift_end'];
  if (!valid.includes(eventType)) return res.status(400).json({ error: `eventType invalide` });

  const db = getDb();
  const id = `TR-${String(Date.now())}-${Math.random().toString(36).slice(2,6)}`;
  db.prepare('INSERT INTO trace_events (id,miner_id,miner_name,event_type,zone,gallery,details,duration) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, minerId, minerName||minerId, eventType, zone, gallery||'', details||null, duration||null);
  const event = db.prepare('SELECT * FROM trace_events WHERE id=?').get(id);
  console.log(`📍 Traçabilité: ${id} - ${minerName} ${eventType} → ${zone}`);
  res.json({ success: true, event: mapEvent(event) });
});

router.get('/trace/events', (req, res) => {
  const db = getDb();
  const { minerId, zone, eventType, limit=100, offset=0 } = req.query;
  let sql = 'SELECT * FROM trace_events WHERE 1=1';
  const params = [];
  if (minerId) { sql += ' AND miner_id=?'; params.push(minerId); }
  if (zone) { sql += ' AND zone=?'; params.push(zone); }
  if (eventType) { sql += ' AND event_type=?'; params.push(eventType); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const events = db.prepare(sql).all(...params);
  const total = events.length;
  const stats = getTraceStats(db);
  res.json({ events: events.map(mapEvent), total, stats });
});

router.get('/trace/stats', (req, res) => {
  const db = getDb();
  res.json(getTraceStats(db));
});

function getTraceStats(db) {
  const totalEntries = db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE event_type='entry'").get().c;
  const totalExits = db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE event_type='exit'").get().c;
  const totalAlerts = db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE event_type='alert'").get().c;
  const totalZoneChanges = db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE event_type='zone_change'").get().c;
  const uniqueMiners = db.prepare('SELECT COUNT(DISTINCT miner_id) as c FROM trace_events').get().c;
  const totalEvents = db.prepare('SELECT COUNT(*) as c FROM trace_events').get().c;

  const zones = ['ZONE A','ZONE B','ZONE C','ZONE D','ZONE E','ZONE F'];
  const zoneActivity = zones.map(z => ({
    zone: z,
    entries: db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE zone=? AND event_type='entry'").get(z).c,
    exits: db.prepare("SELECT COUNT(*) as c FROM trace_events WHERE zone=? AND event_type='exit'").get(z).c,
    total: db.prepare('SELECT COUNT(*) as c FROM trace_events WHERE zone=?').get(z).c,
  }));

  const types = ['entry','exit','zone_change','alert','rest','equipment','shift_start','shift_end'];
  const typeDistribution = types.map(t => ({ type: t, count: db.prepare('SELECT COUNT(*) as c FROM trace_events WHERE event_type=?').get(t).c }));

  return { totalEntries, totalExits, totalAlerts, totalZoneChanges, uniqueMiners, totalEvents, zoneActivity, typeDistribution };
}

// === CONDITIONS ENVIRONNEMENTALES ===

router.get('/env', (req, res) => {
  const db = getDb();
  const conditions = db.prepare('SELECT * FROM env_conditions ORDER BY zone').all();
  res.json({ conditions });
});

router.get('/env/:zone', (req, res) => {
  const db = getDb();
  const cond = db.prepare('SELECT * FROM env_conditions WHERE zone=? ORDER BY updated_at DESC LIMIT 1').get(req.params.zone);
  if (!cond) return res.status(404).json({ error: 'Zone non trouvée' });
  res.json({ condition: cond });
});

router.post('/env/update', (req, res) => {
  const db = getDb();
  const { zone, temperature, humidity, co2_level, dust_level, noise_level, wind_speed, pressure, status } = req.body;
  if (!zone) return res.status(400).json({ error: 'zone requis' });
  const s = status || (temperature > 33 || co2_level > 500 || dust_level > 1.5 ? 'warning' : 'normal');
  db.prepare('UPDATE env_conditions SET temperature=?,humidity=?,co2_level=?,dust_level=?,noise_level=?,wind_speed=?,pressure=?,status=?,updated_at=datetime(\'now\') WHERE zone=?')
    .run(temperature, humidity, co2_level, dust_level, noise_level, wind_speed, pressure, s, zone);
  res.json({ success: true });
});

// === MINEURS ===

router.get('/miners', (req, res) => {
  if (realTimeDataService) {
    const list = Array.from(realTimeDataService.miners.values()).map(m => {
      return {
        ...m,
        heartRate: m.heartRate || m.heart_rate || 70,
        currentZone: m.zone,
        currentGallery: m.gallery,
        watchId: m.watch_id,
        isInService: m.is_in_service === true || m.is_in_service === 1,
        isUnderground: m.is_underground === true || m.is_underground === 1,
        entryTime: m.entry_time,
        exitTime: m.exit_time,
        emergencyContact: m.emergency_contact,
        bloodGroup: m.blood_group,
        accountStatus: m.account_status
      };
    });
    list.sort((a, b) => {
      const zoneComp = (a.currentZone || '').localeCompare(b.currentZone || '');
      if (zoneComp !== 0) return zoneComp;
      return (a.name || '').localeCompare(b.name || '');
    });
    return res.json({ miners: list });
  }

  const db = getDb();
  const miners = db.prepare('SELECT * FROM miners ORDER BY zone, name').all();
  res.json({ miners: miners.map(mapMiner) });
});

router.post('/miners', (req, res) => {
  const db = getDb();
  const { name, role, phone, emergency_contact, blood_group, zone } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Nom et Fonction requis' });

  // Generate matricule
  const row = db.prepare("SELECT matricule FROM miners WHERE matricule LIKE 'M%' ORDER BY CAST(SUBSTR(matricule, 2) AS INTEGER) DESC LIMIT 1").get();
  let nextNum = 1;
  if (row && row.matricule) {
    const currentNum = parseInt(row.matricule.slice(1), 10);
    if (!isNaN(currentNum)) {
      nextNum = currentNum + 1;
    }
  }
  const matricule = `M${String(nextNum).padStart(3, '0')}`;

  db.prepare(`
    INSERT INTO miners (id, name, matricule, role, phone, emergency_contact, blood_group, zone, photo, account_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matricule, name, matricule, role, phone || '', emergency_contact || '', blood_group || 'O+', zone || 'ZONE B', null, 'Actif');

  const miner = db.prepare('SELECT * FROM miners WHERE id=?').get(matricule);
  
  if (realTimeDataService) {
    realTimeDataService.miners.set(matricule, {
      id: matricule,
      name,
      matricule,
      role,
      phone: phone || '',
      emergency_contact: emergency_contact || '',
      blood_group: blood_group || 'O+',
      zone: zone || 'ZONE B',
      gallery: 'Galerie 1',
      photo: null,
      account_status: 'Actif',
      watch_id: null,
      status: 'safe',
      heartRate: 70,
      temperature: 36.5,
      battery: 100,
      position: { x: 500, y: 250, timestamp: Date.now() },
      trajectory: [],
      is_in_service: false,
      is_underground: false,
      entry_time: null,
      exit_time: null,
      activityLevel: 5
    });
  }

  res.json({ success: true, miner: mapMiner(miner) });
});

router.put('/miners/:id', (req, res) => {
  const db = getDb();
  const { zone, gallery, status, heart_rate, temperature, battery, x, y, phone, emergency_contact, blood_group, account_status } = req.body;
  db.prepare(`
    UPDATE miners SET 
      zone=COALESCE(?,zone),
      gallery=COALESCE(?,gallery),
      status=COALESCE(?,status),
      heart_rate=COALESCE(?,heart_rate),
      temperature=COALESCE(?,temperature),
      battery=COALESCE(?,battery),
      x=COALESCE(?,x),
      y=COALESCE(?,y),
      phone=COALESCE(?,phone),
      emergency_contact=COALESCE(?,emergency_contact),
      blood_group=COALESCE(?,blood_group),
      account_status=COALESCE(?,account_status),
      last_update=datetime('now') 
    WHERE id=?
  `).run(zone||null, gallery||null, status||null, heart_rate||null, temperature||null, battery||null, x??null, y??null, phone??null, emergency_contact??null, blood_group??null, account_status??null, req.params.id);
  
  const miner = db.prepare('SELECT * FROM miners WHERE id=?').get(req.params.id);
  
  // Sync memory
  if (realTimeDataService && miner) {
    const memMiner = realTimeDataService.miners.get(req.params.id);
    if (memMiner) {
      Object.assign(memMiner, {
        zone: miner.zone,
        gallery: miner.gallery,
        status: miner.status,
        heartRate: miner.heart_rate,
        temperature: miner.temperature,
        battery: miner.battery,
        phone: miner.phone,
        emergency_contact: miner.emergency_contact,
        blood_group: miner.blood_group,
        account_status: miner.account_status
      });
    }
  }

  res.json({ success: true, miner: mapMiner(miner) });
});

// === MONTRES (PHYSICAL DEVICES) ===

router.get('/watches', (req, res) => {
  const db = getDb();
  const watches = db.prepare('SELECT * FROM watches ORDER BY id').all();
  res.json({ watches });
});

router.post('/watches', (req, res) => {
  const db = getDb();
  const { watchId } = req.body;
  if (!watchId) return res.status(400).json({ error: 'watchId requis' });

  const normalizedId = watchId.trim().toUpperCase();

  const existing = db.prepare('SELECT * FROM watches WHERE id = ?').get(normalizedId);
  if (existing) return res.status(400).json({ error: 'Cette montre existe déjà dans le système' });

  db.prepare("INSERT INTO watches (id, status, last_seen) VALUES (?, 'available', datetime('now'))").run(normalizedId);
  res.json({ success: true, message: `Montre ${normalizedId} créée avec succès` });
});

router.post('/devices/associate', (req, res) => {
  const db = getDb();
  const { matricule, watchId } = req.body;
  if (!matricule || !watchId) return res.status(400).json({ error: 'matricule et watchId requis' });

  const normalizedWatchId = watchId.trim().toUpperCase();

  const miner = db.prepare('SELECT * FROM miners WHERE id = ?').get(matricule);
  if (!miner) return res.status(404).json({ error: 'Mineur non trouvé' });

  // Unbind this watch from anyone else
  db.prepare('UPDATE miners SET watch_id = NULL WHERE watch_id = ?').run(normalizedWatchId);
  
  // Unbind this miner from their old watch
  if (miner.watch_id) {
    db.prepare('UPDATE watches SET status = \'available\' WHERE id = ?').run(miner.watch_id);
  }

  // Bind watch and miner
  db.prepare('UPDATE miners SET watch_id = ? WHERE id = ?').run(normalizedWatchId, matricule);
  db.prepare('UPDATE watches SET status = \'assigned\' WHERE id = ?').run(normalizedWatchId);

  // Sync memory store
  if (realTimeDataService) {
    for (const [mid, m] of realTimeDataService.miners.entries()) {
      if (m.watch_id === normalizedWatchId) m.watch_id = null;
    }
    const memMiner = realTimeDataService.miners.get(matricule);
    if (memMiner) {
      memMiner.watch_id = normalizedWatchId;
    }
  }

  if (websocketManager) {
    websocketManager.broadcast('location-update', {
      type: 'location-update',
      minerId: matricule,
      name: miner.name,
      watchId: normalizedWatchId,
      is_in_service: miner.is_in_service === 1,
      is_underground: miner.is_underground === 1,
      timestamp: Date.now()
    });
  }

  res.json({ success: true, message: `Montre ${normalizedWatchId} attribuée au mineur ${miner.name}` });
});

router.post('/devices/dissociate', (req, res) => {
  const db = getDb();
  const { watchId } = req.body;
  if (!watchId) return res.status(400).json({ error: 'watchId requis' });

  const normalizedWatchId = watchId.trim().toUpperCase();

  const miner = db.prepare('SELECT * FROM miners WHERE watch_id = ?').get(normalizedWatchId);

  db.prepare("UPDATE miners SET watch_id = NULL, is_in_service = 0, is_underground = 0, status = 'safe', x = NULL, y = NULL WHERE watch_id = ?").run(normalizedWatchId);
  db.prepare('UPDATE watches SET status = \'available\' WHERE id = ?').run(normalizedWatchId);

  // Sync memory store
  if (realTimeDataService) {
    for (const [mid, m] of realTimeDataService.miners.entries()) {
      if (m.watch_id === normalizedWatchId) {
        m.watch_id = null;
        m.is_in_service = false;
        m.is_underground = false;
      }
    }
  }

  if (miner && websocketManager) {
    websocketManager.broadcast('location-update', {
      type: 'location-update',
      minerId: miner.id,
      name: miner.name,
      watchId: null,
      is_in_service: false,
      is_underground: false,
      timestamp: Date.now()
    });
  }

  res.json({ success: true, message: `Montre ${watchId} détachée avec succès` });
});

// === CONTROLE D'ACCES ===

router.post('/trace/access-control', (req, res) => {
  const db = getDb();
  const { minerId, action, zone, responsible } = req.body;
  if (!minerId || !action || !zone) return res.status(400).json({ error: 'minerId, action et zone requis' });
  if (!['entry', 'exit'].includes(action)) return res.status(400).json({ error: 'action doit être entry ou exit' });

  const miner = db.prepare('SELECT * FROM miners WHERE id = ?').get(minerId);
  if (!miner) return res.status(404).json({ error: 'Mineur non trouvé' });

  const eventId = `TR-${String(Date.now())}`;
  const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (action === 'entry') {
    db.prepare("UPDATE miners SET is_underground = 1, entry_time = datetime('now'), exit_time = NULL, zone = ? WHERE id = ?")
      .run(zone, minerId);

    const details = `${timeStr} : ${miner.name} est entré dans la ${zone}. Validé par ${responsible || 'Superviseur'}.`;
    db.prepare('INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)')
      .run(eventId, minerId, miner.name, 'entry', zone, details);

    // Sync memory
    const memMiner = realTimeDataService?.miners.get(minerId);
    if (memMiner) {
      memMiner.is_underground = true;
      memMiner.entry_time = new Date().toISOString();
      memMiner.exit_time = null;
      memMiner.zone = zone;
    }

    if (websocketManager) {
      websocketManager.broadcast('location-update', {
        type: 'location-update',
        minerId: minerId,
        name: miner.name,
        position: memMiner?.position || { x: 500, y: 250, timestamp: Date.now() },
        zone: zone,
        is_in_service: true,
        is_underground: true,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: `${miner.name} est entré dans la mine (${zone})` });
  } else {
    // Exit
    const entryTime = miner.entry_time ? new Date(miner.entry_time) : new Date(Date.now() - 8 * 3600 * 1000);
    const durationMin = Math.round((Date.now() - entryTime.getTime()) / 60000);

    db.prepare("UPDATE miners SET is_underground = 0, is_in_service = 0, watch_id = NULL, exit_time = datetime('now'), status = 'safe' WHERE id = ?")
      .run(minerId);

    if (miner.watch_id) {
      db.prepare("UPDATE watches SET status = 'available' WHERE id = ?").run(miner.watch_id);
    }

    const details = `Sortie de la mine. Temps passé sous terre : ${durationMin} min. Validé par ${responsible || 'Superviseur'}.`;
    db.prepare('INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details, duration) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(eventId, minerId, miner.name, 'exit', zone, details, durationMin);

    // Fin de poste automatique
    const shiftEndId = `TR-${String(Date.now() + 1)}`;
    db.prepare("INSERT INTO trace_events (id, miner_id, miner_name, event_type, zone, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(shiftEndId, minerId, miner.name, 'shift_end', zone, 'Fin du quart de travail (Sortie de mine)');

    // Sync memory
    const memMiner = realTimeDataService?.miners.get(minerId);
    if (memMiner) {
      memMiner.is_underground = false;
      memMiner.is_in_service = false;
      memMiner.watch_id = null;
      memMiner.exit_time = new Date().toISOString();
      memMiner.status = 'safe';
    }

    if (websocketManager) {
      websocketManager.broadcast('location-update', {
        type: 'location-update',
        minerId: minerId,
        name: miner.name,
        position: memMiner?.position || { x: 500, y: 250, timestamp: Date.now() },
        zone: zone,
        is_in_service: false,
        is_underground: false,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: `${miner.name} est sorti de la mine.` });
  }
});

// === PASSERELLES LORA ===

router.get('/gateways', (req, res) => {
  const db = getDb();
  const gateways = db.prepare('SELECT * FROM lora_gateways').all();
  res.json({ gateways: gateways.map(mapGateway) });
});

// === EXTRACTIONS ===

router.get('/extractions', (req, res) => {
  const db = getDb();
  const extractions = db.prepare('SELECT * FROM extractions').all();
  res.json({ extractions });
});

// === SYSTEM ===
import os from 'os';

router.get('/system/stats', (req, res) => {
  const memoryUsed = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const cpus = os.cpus();
  let cpuUsage = 0;
  if (cpus && cpus.length > 0) {
    // Very basic average cpu estimation for the moment
    cpuUsage = Math.round((os.loadavg()[0] / cpus.length) * 100) || 5; 
  }
  
  res.json({ 
    uptime: process.uptime(),
    memoryUsed,
    totalMem,
    cpuUsage,
    status: 'online'
  });
});

// === USERS ===
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users').all();
  res.json({ users });
});

// Init trace data from DB (called at startup)
export function initTraceData() {
  const db = getDb();
  const c = db.prepare('SELECT COUNT(*) as c FROM trace_events').get().c;
  if (c > 0) console.log(`📍 ${c} événements de traçabilité en base`);
}

export default router;
