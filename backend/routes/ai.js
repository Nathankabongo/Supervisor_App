import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const predictions = db.prepare('SELECT * FROM ai_predictions').all();
  res.json({ predictions });
});

export default router;
