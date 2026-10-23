import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET non configuré');
  return secret;
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** JWT utilisateur — commandes UI / provision. Ne pas appliquer à /api/watch. */
export function authUser(req, res, next) {
  const token = readBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    return res.status(401).json({ error: 'Jeton invalide' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Rôle administrateur requis' });
  }
  next();
}
