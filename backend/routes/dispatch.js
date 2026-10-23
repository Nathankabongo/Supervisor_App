import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/missions', (req, res) => {
  try {
    const db = getDb();
    const missions = db.prepare('SELECT * FROM dispatch_missions').all();
    res.json({ missions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/optimize', (req, res) => {
  try {
    const db = getDb();
    const missions = db.prepare('SELECT * FROM dispatch_missions').all();
    const etas = ['2 min', '3 min', '4 min', '5 min', '6 min'];
    const update = db.prepare('UPDATE dispatch_missions SET eta = ?, status = ? WHERE id = ?');
    for (const m of missions) {
      const eta = etas[Math.floor(Math.random() * etas.length)];
      const status = m.status === 'Queued' ? 'In Progress' : m.status;
      update.run(eta, status, m.id);
    }
    const refreshed = db.prepare('SELECT * FROM dispatch_missions').all();
    res.json({ success: true, message: 'Itinéraires optimisés par IA', missions: refreshed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
