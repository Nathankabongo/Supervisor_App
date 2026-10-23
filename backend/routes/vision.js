import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/cameras', (req, res) => {
  try {
    const db = getDb();
    const cameras = db.prepare('SELECT * FROM vision_cameras').all();
    res.json({ cameras });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
