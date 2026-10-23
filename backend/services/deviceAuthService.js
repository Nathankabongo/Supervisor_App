import crypto from 'crypto';
import { getDb } from './database.js';

export function hashDeviceToken(plaintext) {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function findDeviceByToken(plaintext) {
  if (!plaintext) return null;
  const db = getDb();
  const tokenHash = hashDeviceToken(plaintext);
  return db.prepare('SELECT * FROM devices WHERE token_hash = ?').get(tokenHash) || null;
}

/**
 * Crée l'appareil ou émet le token si le seed n'en a pas encore.
 * Le plaintext n'est renvoyé qu'une fois — jamais au frontend ensuite.
 */
export function provisionDevice({ id, zone, gallery }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);

  if (existing?.token_hash) {
    return { error: 'conflict', status: 409, message: 'Appareil déjà provisionné' };
  }

  const plaintext = generateDeviceToken();
  const tokenHash = hashDeviceToken(plaintext);

  if (existing) {
    db.prepare(`
      UPDATE devices SET zone = ?, gallery = COALESCE(?, gallery), token_hash = ?, revoked = 0
      WHERE id = ?
    `).run(zone, gallery || null, tokenHash, id);
  } else {
    db.prepare(`
      INSERT INTO devices (id, zone, gallery, status, last_seen, token_hash, revoked)
      VALUES (?, ?, ?, 'UNKNOWN', NULL, ?, 0)
    `).run(id, zone, gallery || null, tokenHash);
  }

  const device = db.prepare(
    'SELECT id, zone, gallery, status, last_seen, revoked FROM devices WHERE id = ?'
  ).get(id);

  return { device, deviceToken: plaintext };
}

export function revokeDevice(deviceId) {
  const db = getDb();
  const info = db.prepare('UPDATE devices SET revoked = 1, token_hash = NULL WHERE id = ?').run(deviceId);
  return info.changes > 0;
}
