import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/metrics', (req, res) => {
  try {
    const db = getDb();
    const energy = db.prepare('SELECT * FROM energy_metrics ORDER BY id DESC LIMIT 1').get() || {
      hydro_kw: 1420, diesel_lph: 850, solar_kw: 480, battery_pct: 92, cost_per_kwh: 0.082
    };
    res.json({ energy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
