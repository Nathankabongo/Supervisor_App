import { findDeviceByToken } from '../services/deviceAuthService.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Token appareil ESP32 — jamais le JWT utilisateur. */
export function authDevice(req, res, next) {
  const token = readBearer(req);
  if (!token) {
    console.warn(`[devices] 401 sans Bearer ${req.method} ${req.originalUrl} ip=${req.ip}`);
    return res.status(401).json({ error: 'Jeton appareil requis' });
  }

  const device = findDeviceByToken(token);
  if (!device) {
    console.warn(`[devices] 401 jeton inconnu ${req.method} ${req.originalUrl} ip=${req.ip}`);
    return res.status(401).json({ error: 'Jeton appareil invalide' });
  }
  if (device.revoked) {
    return res.status(403).json({ error: 'Appareil révoqué' });
  }

  const paramId = req.params.deviceId;
  if (paramId && paramId !== device.id) {
    return res.status(403).json({ error: 'Jeton non valide pour cet appareil' });
  }

  req.device = device;
  next();
}
