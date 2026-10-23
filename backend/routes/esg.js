import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const esg = db.prepare('SELECT * FROM esg_metrics ORDER BY id DESC LIMIT 1').get() || {
    co2_emissions: 14.2,
    water_usage: 520.0,
    water_recycled: 440.0,
    pm25: 11.5,
    pm10: 24.1,
    air_quality_status: 'Conforme Standards ESG'
  };
  res.json({ esg });
});

export default router;
