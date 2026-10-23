import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/sensors', (req, res) => {
  try {
    const db = getDb();
    const sensors = db.prepare('SELECT * FROM water_sensors').all();
    res.json({ sensors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
