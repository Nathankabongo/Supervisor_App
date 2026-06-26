import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../services/database.js';

const router = express.Router();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET non configuré');
  return secret;
};

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Identifiants invalides' });

  const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, getJwtSecret(), { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// Signup
router.post('/signup', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Tous les champs requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe min 6 caractères' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(username, hashedPassword, name, 'supervisor');

  const token = jwt.sign({ userId: result.lastInsertRowid, username, role: 'supervisor' }, getJwtSecret(), { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: result.lastInsertRowid, username, name, role: 'supervisor' } });
});

// Logout
router.post('/logout', (req, res) => res.json({ message: 'Déconnexion réussie' }));

// Verify token
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Aucun jeton fourni' });
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
    res.json({ valid: true, user: { ...decoded, name: user?.name || decoded.username } });
  } catch { res.status(401).json({ error: 'Jeton invalide' }); }
});

export default router;
