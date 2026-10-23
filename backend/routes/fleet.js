import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  res.json({ vehicles });
});

router.post('/:id/tele-remote', (req, res) => {
  const db = getDb();
  const { mode } = req.body;
  db.prepare('UPDATE vehicles SET operator=?, is_autonomous=1 WHERE id=?')
    .run(mode === 'tele-remote' ? 'Télé-opérateur Surface' : 'Pilote Automatique AHS', req.params.id);
  res.json({ success: true, message: `Mode ${mode} activé sur le véhicule ${req.params.id}` });
});

export default router;
