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

export function getProvisionKey() {
  return process.env.ULINZI_PROVISION_KEY || 'ULINZI-SITE-2026';
}

/**
 * Permet à une Ulinzi Box de s'enregistrer automatiquement (ou de renouveler son jeton
 * si la base a été réinitialisée) grâce à la clé de provisionnement du site.
 */
export function registerBoxWithKey({ id, name, zone, gallery, deviceType, provisionKey }) {
  if (!provisionKey || provisionKey !== getProvisionKey()) {
    return { error: 'unauthorized', status: 401, message: 'Clé de provisionnement invalide' };
  }
  const cleanId = String(id || '').trim();
  const cleanZone = String(zone || 'ZONE B').trim();
  if (!cleanId) {
    return { error: 'invalid', status: 400, message: 'deviceId requis' };
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(cleanId);
  if (existing?.revoked) {
    return { error: 'revoked', status: 403, message: 'Appareil révoqué' };
  }

  const plaintext = generateDeviceToken();
  const tokenHash = hashDeviceToken(plaintext);

  if (existing) {
    // Supervisor_App reste la source de vérité : on ne réécrase pas une zone/galerie déjà affectée par l'admin
    const keepZone = existing.zone && existing.zone !== 'NON_AFFECTEE';
    const nextZone = keepZone ? existing.zone : cleanZone;
    const nextGallery = existing.gallery && keepZone ? existing.gallery : (gallery || existing.gallery || null);
    const nextName = existing.name && keepZone ? existing.name : (name || existing.name || null);
    db.prepare(`
      UPDATE devices
      SET name = ?,
          zone = ?,
          gallery = ?,
          device_type = COALESCE(NULLIF(?, ''), device_type),
          token_hash = ?,
          revoked = 0
      WHERE id = ?
    `).run(nextName, nextZone, nextGallery, deviceType || 'ULINZI_BOX', tokenHash, cleanId);
  } else {
    db.prepare(`
      INSERT INTO devices (id, name, zone, gallery, device_type, status, last_seen, token_hash, revoked)
      VALUES (?, ?, ?, ?, ?, 'ONLINE', datetime('now'), ?, 0)
    `).run(cleanId, name || cleanId, cleanZone, gallery || null, deviceType || 'ULINZI_BOX', tokenHash);
  }

  const device = db.prepare(
    'SELECT id, name, zone, gallery, device_type, status, last_seen, revoked FROM devices WHERE id = ?'
  ).get(cleanId);

  return { device, deviceToken: plaintext };
}

export function revokeDevice(deviceId) {
  const db = getDb();
  const info = db.prepare('UPDATE devices SET revoked = 1, token_hash = NULL WHERE id = ?').run(deviceId);
  return info.changes > 0;
}

export function deleteDevice(deviceId) {
  const db = getDb();
  db.prepare('DELETE FROM device_commands WHERE device_id = ?').run(deviceId);
  const info = db.prepare('DELETE FROM devices WHERE id = ?').run(deviceId);
  return info.changes > 0;
}
