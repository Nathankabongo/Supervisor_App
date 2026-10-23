import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const sensors = db.prepare('SELECT * FROM geotech_sensors').all();
  res.json({ sensors });
});

export default router;
