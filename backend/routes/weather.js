import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/site', (req, res) => {
  try {
    const db = getDb();
    const weather = db.prepare('SELECT * FROM weather_metrics ORDER BY id DESC LIMIT 1').get() || {
      lightning_strikes_20km: 0, wind_speed_ms: 1.2, wind_direction: 'Nord-Est', blast_permission: 'AUTORISÉ', rain_forecast: 'Nuageux sans pluie'
    };
    res.json({ weather });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
