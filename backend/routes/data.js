import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

// Map DB snake_case rows to frontend camelCase
function mapMessage(m) {
  return { ...m, targets: JSON.parse(m.targets||'[]'), deliveredTo: JSON.parse(m.delivered_to||'[]'), readBy: JSON.parse(m.read_by||'[]'), recipientMode: m.recipient_mode, createdAt: m.created_at };
}
function mapEvent(e) {
  return { ...e, minerId: e.miner_id, minerName: e.miner_name, eventType: e.event_type, createdAt: e.created_at };
}
function mapMiner(m) {
  return { ...m, heartRate: m.heart_rate, currentZone: m.zone, currentGallery: m.gallery, lastUpdate: m.last_update };
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

  // Simuler délivrance
  setTimeout(() => {
    const tCount = recipientMode === 'all' ? 12 : targets.length;
    const delivered = JSON.stringify(Array.from({length:tCount},(_,i)=>`MIN-${String(i+1).padStart(3,'0')}`));
    db.prepare('UPDATE messages SET status=?,delivered_to=? WHERE id=?').run('delivered', delivered, id);
  }, 1500);
  setTimeout(() => {
    const tCount = recipientMode === 'all' ? 12 : targets.length;
    const read = JSON.stringify(Array.from({length:Math.floor(tCount*0.7)},(_,i)=>`MIN-${String(i+1).padStart(3,'0')}`));
    db.prepare('UPDATE messages SET status=?,read_by=? WHERE id=?').run('read', read, id);
  }, 4000);

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
  const db = getDb();
  const miners = db.prepare('SELECT * FROM miners ORDER BY zone, name').all();
  res.json({ miners: miners.map(mapMiner) });
});

router.put('/miners/:id', (req, res) => {
  const db = getDb();
  const { zone, gallery, status, heart_rate, temperature, battery, x, y } = req.body;
  db.prepare('UPDATE miners SET zone=COALESCE(?,zone),gallery=COALESCE(?,gallery),status=COALESCE(?,status),heart_rate=COALESCE(?,heart_rate),temperature=COALESCE(?,temperature),battery=COALESCE(?,battery),x=COALESCE(?,x),y=COALESCE(?,y),last_update=datetime(\'now\') WHERE id=?')
    .run(zone||null, gallery||null, status||null, heart_rate||null, temperature||null, battery||null, x??null, y??null, req.params.id);
  const miner = db.prepare('SELECT * FROM miners WHERE id=?').get(req.params.id);
  res.json({ success: true, miner: mapMiner(miner) });
});

// === PASSERELLES LORA ===

router.get('/gateways', (req, res) => {
  const db = getDb();
  const gateways = db.prepare('SELECT * FROM lora_gateways').all();
  res.json({ gateways: gateways.map(mapGateway) });
});

// Init trace data from DB (called at startup)
export function initTraceData() {
  const db = getDb();
  const c = db.prepare('SELECT COUNT(*) as c FROM trace_events').get().c;
  if (c > 0) console.log(`📍 ${c} événements de traçabilité en base`);
}

// Add trace event from simulator
export function addTraceEventFromSimulator(event) {
  const db = getDb();
  const id = `TR-${String(Date.now())}-${Math.random().toString(36).slice(2,6)}`;
  db.prepare('INSERT INTO trace_events (id,miner_id,miner_name,event_type,zone,gallery,details) VALUES (?,?,?,?,?,?,?)')
    .run(id, event.minerId, event.minerName, event.eventType, event.zone, event.gallery||'', event.details||null);
  console.log(`📍 Traçabilité auto: ${id} - ${event.minerName} ${event.eventType} → ${event.zone}`);
}

export default router;
