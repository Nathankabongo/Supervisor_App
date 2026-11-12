import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

function readFullMineMap(db) {
  const levels = db
    .prepare('SELECT id, name, depth_m, width_m, height_m, background_image, background_opacity, sort_order FROM mine_levels ORDER BY sort_order ASC, created_at ASC')
    .all();
  const nodes = db
    .prepare('SELECT id, level_id, x, y, type, label, zone FROM mine_nodes')
    .all();
  const segments = db
    .prepare('SELECT id, level_id, from_node_id, to_node_id, name, width_m, status FROM mine_segments')
    .all();
  const anchors = db
    .prepare('SELECT id, device_id, level_id, segment_id, x, y, tx_power, path_loss_n FROM mine_anchors')
    .all();
  const devices = db
    .prepare('SELECT id, name, zone, gallery, status, device_type FROM devices ORDER BY id ASC')
    .all();

  return { levels, nodes, segments, anchors, devices };
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    res.json(readFullMineMap(db));
  } catch (err) {
    console.error('Erreur GET /api/mine-map:', err);
    res.status(500).json({ error: 'Impossible de charger la carte souterraine' });
  }
});

router.put('/', (req, res) => {
  try {
    const { levels, nodes, segments, anchors } = req.body || {};
    if (!Array.isArray(levels) || !Array.isArray(nodes) || !Array.isArray(segments) || !Array.isArray(anchors)) {
      return res.status(400).json({ error: 'Format invalide : levels, nodes, segments et anchors doivent être des tableaux' });
    }

    const db = getDb();
    const saveTx = db.transaction(() => {
      db.prepare('DELETE FROM mine_anchors').run();
      db.prepare('DELETE FROM mine_segments').run();
      db.prepare('DELETE FROM mine_nodes').run();
      db.prepare('DELETE FROM mine_levels').run();

      const insLevel = db.prepare(
        'INSERT INTO mine_levels (id, name, depth_m, width_m, height_m, background_image, background_opacity, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      levels.forEach((lvl, idx) => {
        if (!lvl?.id || !lvl?.name) return;
        insLevel.run(
          String(lvl.id),
          String(lvl.name),
          Number.isFinite(Number(lvl.depth_m)) ? Number(lvl.depth_m) : 0,
          Math.max(10, Number(lvl.width_m) || 200),
          Math.max(10, Number(lvl.height_m) || 120),
          lvl.background_image ? String(lvl.background_image) : null,
          Number.isFinite(Number(lvl.background_opacity)) ? Number(lvl.background_opacity) : 0.35,
          Number.isFinite(Number(lvl.sort_order)) ? Number(lvl.sort_order) : idx
        );
      });

      const insNode = db.prepare(
        'INSERT INTO mine_nodes (id, level_id, x, y, type, label, zone) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const n of nodes) {
        if (!n?.id || !n?.level_id) continue;
        insNode.run(
          String(n.id),
          String(n.level_id),
          Number(n.x) || 0,
          Number(n.y) || 0,
          String(n.type || 'junction'),
          n.label ? String(n.label) : null,
          n.zone ? String(n.zone) : null
        );
      }

      const insSeg = db.prepare(
        'INSERT INTO mine_segments (id, level_id, from_node_id, to_node_id, name, width_m, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const s of segments) {
        if (!s?.id || !s?.level_id || !s?.from_node_id || !s?.to_node_id) continue;
        insSeg.run(
          String(s.id),
          String(s.level_id),
          String(s.from_node_id),
          String(s.to_node_id),
          s.name ? String(s.name) : null,
          Number(s.width_m) || 4,
          String(s.status || 'open')
        );
      }

      const insAnchor = db.prepare(
        'INSERT INTO mine_anchors (id, device_id, level_id, segment_id, x, y, tx_power, path_loss_n) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const a of anchors) {
        if (!a?.id || !a?.device_id || !a?.level_id) continue;
        insAnchor.run(
          String(a.id),
          String(a.device_id),
          String(a.level_id),
          a.segment_id ? String(a.segment_id) : null,
          Number(a.x) || 0,
          Number(a.y) || 0,
          Number.isFinite(Number(a.tx_power)) ? Number(a.tx_power) : -59,
          Number.isFinite(Number(a.path_loss_n)) ? Number(a.path_loss_n) : 2.3
        );
      }
    });

    saveTx();
    res.json({ success: true, message: 'Carte souterraine sauvegardée', ...readFullMineMap(db) });
  } catch (err) {
    console.error('Erreur PUT /api/mine-map:', err);
    res.status(500).json({ error: 'Impossible de sauvegarder la carte souterraine' });
  }
});

export default router;

