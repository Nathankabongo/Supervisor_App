import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/kpis', (req, res) => {
  try {
    const db = getDb();
    const kpis = db.prepare('SELECT * FROM director_kpis ORDER BY id DESC LIMIT 1').get() || {
      oee_pct: 88.4, cost_per_ton: 24.50, ltifr: 0.00, monthly_prod_tons: 42500, ebitda_margin_pct: 42.6, accident_free_days: 450
    };
    res.json({ kpis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
