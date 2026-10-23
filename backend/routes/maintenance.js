import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const logs = db.prepare('SELECT * FROM maintenance_logs ORDER BY risk_score DESC').all();
  res.json({ logs });
});

export default router;
