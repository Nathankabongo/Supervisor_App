import { getDb } from './database.js';
import http from 'http';

export const DEVICE_ONLINE_SECONDS = 20;

export function isoNow() {
  return new Date().toISOString();
}

/** Normalise sqlite datetime / ISO vers ISO-8601 UTC avec millisecondes. */
export function toIsoMs(value) {
  if (!value) return isoNow();
  const raw = String(value);
  if (/T.*Z$/.test(raw) || /T.*[+-]\d{2}:\d{2}$/.test(raw)) {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? isoNow() : new Date(parsed).toISOString();
  }
  const parsed = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed) ? isoNow() : new Date(parsed).toISOString();
}

function diffMs(fromIso, toIso) {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

export function computeDeviceStatus(lastSeen) {
  if (!lastSeen) return 'UNKNOWN';
  const db = getDb();
  const row = db.prepare(
    `SELECT CAST((julianday('now') - julianday(?)) * 86400.0 AS INTEGER) AS age`
  ).get(lastSeen);
  if (row?.age == null || Number.isNaN(row.age)) return 'UNKNOWN';
  return row.age <= DEVICE_ONLINE_SECONDS ? 'ONLINE' : 'OFFLINE';
}

export function findDevicesByZone(zone) {
  const db = getDb();
  if (!zone) return [];
  return db.prepare(
    "SELECT * FROM devices WHERE revoked = 0 AND trim(zone) = trim(?)"
  ).all(String(zone));
}

export function getDevice(deviceId) {
  const db = getDb();
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) || null;
}

export function listDevices() {
  const db = getDb();
  return db.prepare('SELECT * FROM devices ORDER BY id').all().map(mapDevicePublic);
}

export function mapDevicePublic(row) {
  const status = computeDeviceStatus(row.last_seen);
  return {
    id: row.id,
    zone: row.zone,
    gallery: row.gallery,
    status,
    lastSeen: row.last_seen,
    siren: row.siren === 1,
    alarmSource: row.alarm_source,
    activeAlertId: row.active_alert_id,
    lastCommandId: row.last_command_id || null,
    lastCommandStatus: row.last_command_status || null,
    revoked: row.revoked === 1,
  };
}

export function enqueueCommand({ deviceId, action, clientCommandId, message, alertId, source }) {
  if (!deviceId || !action || !clientCommandId) {
    return { ok: false, error: 'deviceId, action et clientCommandId requis' };
  }
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM device_commands WHERE client_command_id = ?'
  ).get(clientCommandId);
  if (existing) {
    return { ok: true, duplicate: true, commandId: existing.id, createdAt: toIsoMs(existing.created_at) };
  }

  const createdAt = isoNow();
  const info = db.prepare(`
    INSERT INTO device_commands (
      device_id, action, message, alert_id, client_command_id, source, execution_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', ?)
  `).run(deviceId, action, message || null, alertId || null, clientCommandId, source || null, createdAt);

  console.log(`[T1] ACTIVATE/cmd queued commandId=${info.lastInsertRowid} action=${action} alertId=${alertId || '-'} device=${deviceId} createdAt=${createdAt}`);
  return { ok: true, duplicate: false, commandId: info.lastInsertRowid, createdAt };
}

export function pushSirenToEsp(on, alert = {}) {
  const db = getDb();
  const devices = db.prepare('SELECT * FROM devices WHERE revoked = 0').all();
  for (const d of devices) {
    const ip = d.last_ip;
    if (!ip) {
      console.warn(`[push] ${d.id} sans IP LAN — attente télémétrie ESP`);
      continue;
    }
    const port = Number(d.listen_port) > 0 ? Number(d.listen_port) : 8080;
        const alertId = encodeURIComponent(alert.id || alert.alertId || '');
        const path = on ? `/siren/on?alertId=${alertId}` : '/siren/off';
    const body = JSON.stringify({
      action: on ? 'ACTIVATE_SIREN' : 'DEACTIVATE_SIREN',
      alertId: alert.id || alert.alertId || null,
      message: alert.message || '',
    });
    const req = http.request(
      {
        host: ip,
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 2500,
      },
      (res) => {
        console.log(`[push] ${on ? 'ON' : 'OFF'} ${d.id} http://${ip}:${port}${path} → ${res.statusCode}`);
        res.resume();
      }
    );
    req.on('error', (e) => {
      console.warn(`[push] echec ${d.id} http://${ip}:${port}${path} : ${e.message}`);
    });
    req.on('timeout', () => {
      req.destroy();
      console.warn(`[push] timeout ${d.id} http://${ip}:${port}${path}`);
    });
    req.write(body);
    req.end();
  }
}

export function enqueueActivateSirenForZone(zone, alert) {
  const db = getDb();
  let devices = findDevicesByZone(zone);
  const all = db.prepare('SELECT * FROM devices WHERE revoked = 0').all();
  if (!devices.length) {
    devices = all;
    console.warn(`[devices] Aucun ESP32 pour la zone "${zone || ''}" — commande envoyée à tous (${devices.map((d) => d.id).join(', ') || 'aucun'})`);
  } else {
    const ids = new Set(devices.map((d) => d.id));
    for (const d of all) {
      if (!ids.has(d.id)) devices.push(d);
    }
  }
  if (!devices.length) {
    console.warn(`[devices] Aucun ESP32 enregistré — sirène non enfilée (alerte ${alert.id})`);
    return [];
  }
  pushSirenToEsp(true, alert);
  const clientCommandId = `siren-${alert.id}`;
  return devices.map((d) =>
    enqueueCommand({
      deviceId: d.id,
      action: 'ACTIVATE_SIREN',
      clientCommandId: `${clientCommandId}-${d.id}`,
      message: alert.message || 'ALERME ZONE',
      alertId: alert.id,
      source: alert.source || 'LILYGO_INCIDENT',
    })
  );
}

export function enqueueDeactivateSirenForZone(zone, reasonId) {
  const db = getDb();
  let devices = findDevicesByZone(zone);
  if (!devices.length) {
    devices = db.prepare('SELECT * FROM devices WHERE revoked = 0').all();
  }
  pushSirenToEsp(false, { id: reasonId });
  return devices.map((d) =>
    enqueueCommand({
      deviceId: d.id,
      action: 'DEACTIVATE_SIREN',
      clientCommandId: `siren-off-${reasonId || Date.now()}-${d.id}`,
      message: 'ALARME ACQUITTEE',
      alertId: reasonId || null,
      source: 'MANUAL',
    })
  );
}

export function enqueueForAllDevices(action, clientCommandPrefix, message, { alertId, source } = {}) {
  const db = getDb();
  const devices = db.prepare('SELECT * FROM devices WHERE revoked = 0').all();
  return devices.map((d) =>
    enqueueCommand({
      deviceId: d.id,
      action,
      clientCommandId: `${clientCommandPrefix}-${d.id}`,
      message,
      alertId: alertId || null,
      source: source || 'SYSTEM',
    })
  );
}

export function consumePendingCommands(deviceId, autoAck = true) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      c.id,
      c.action,
      c.message,
      c.alert_id AS alertId,
      c.client_command_id AS clientCommandId,
      c.created_at AS createdAt,
      c.device_id AS deviceId,
      c.source,
      c.execution_status AS executionStatus,
      d.zone AS zoneId
    FROM device_commands c
    JOIN devices d ON d.id = c.device_id
    WHERE c.device_id = ?
      AND (c.execution_status IS NULL OR c.execution_status IN ('QUEUED', 'RECEIVED'))
    ORDER BY c.id ASC
    LIMIT 16
  `).all(deviceId);

  if (autoAck && rows.length) {
    const mark = db.prepare(`
      UPDATE device_commands
      SET consumed = 1, execution_status = 'RECEIVED', received_at = COALESCE(received_at, datetime('now'))
      WHERE id = ? AND (execution_status IS NULL OR execution_status = 'QUEUED')
    `);
    const expire = db.prepare(`
      UPDATE device_commands
      SET consumed = 1, execution_status = 'EXPIRED'
      WHERE id = ?
    `);
    const fresh = [];
    const cutoff = Date.now() - 90_000;
    const tx = db.transaction((list) => {
      for (const row of list) {
        const createdMs = Date.parse(toIsoMs(row.createdAt));
        const tooOld =
          row.action === 'ACTIVATE_SIREN' &&
          !Number.isNaN(createdMs) &&
          createdMs < cutoff;
        if (tooOld) {
          const stillActive = row.alertId
            ? db.prepare(
                `SELECT 1 AS ok FROM alerts
                 WHERE id = ?
                   AND COALESCE(resolved, 0) = 0
                   AND COALESCE(status, 'ACTIVE') = 'ACTIVE'`
              ).get(row.alertId)
            : null;
          if (!stillActive) {
            expire.run(row.id);
            console.log(`[cmd-expire] commandId=${row.id} alertId=${row.alertId || '-'} trop vieux — pas envoyé à l'ESP32`);
            continue;
          }
        }
        mark.run(row.id);
        fresh.push(row);
      }
    });
    tx(rows);
    if (fresh.length) {
      console.log(`[cmd-fetch] RECEIVED count=${fresh.length} device=${deviceId} at=${isoNow()}`);
    }
    rows.length = 0;
    rows.push(...fresh);
  }

  return rows.map((row) => {
    const createdAt = toIsoMs(row.createdAt);
    return {
      commandId: String(row.id),
      id: row.id,
      command: row.action,
      action: row.action,
      message: row.message,
      alertId: row.alertId,
      clientCommandId: row.clientCommandId,
      deviceId: row.deviceId,
      zoneId: row.zoneId,
      source: row.source,
      createdAt,
      issuedAt: createdAt,
      status: autoAck ? 'RECEIVED' : (row.executionStatus || 'QUEUED'),
    };
  });
}

/** État sirène = mêmes alertes actives que l'application (pas seulement la file de commandes). */
export function getSirenSyncState(device) {
  const db = getDb();
  const alert = db.prepare(`
    SELECT id, minerId, minerName, type, message, zone, timestamp, source,
           COALESCE(status, 'ACTIVE') AS status, COALESCE(siren, 1) AS siren
    FROM alerts
    WHERE COALESCE(resolved, 0) = 0
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
      AND COALESCE(siren, 1) = 1
    ORDER BY timestamp DESC
    LIMIT 1
  `).get();

  const pendingActivate = db.prepare(`
    SELECT id, alert_id, created_at
    FROM device_commands
    WHERE device_id = ?
      AND action = 'ACTIVATE_SIREN'
      AND (execution_status IS NULL OR execution_status IN ('QUEUED', 'RECEIVED'))
    ORDER BY id DESC
    LIMIT 1
  `).get(device.id);

  const desiredSiren = !!(alert || pendingActivate);
  /* Heure du poll, pas du SOS : sinon l'ESP ignore ACTIVATE si le SOS a > 90 s. */
  const createdAt = desiredSiren ? isoNow() : null;

  return {
    desiredSiren,
    siren: desiredSiren,
    alert: alert
      ? {
          alertId: alert.id,
          id: alert.id,
          minerId: alert.minerId,
          minerName: alert.minerName,
          type: alert.type,
          message: alert.message,
          zone: alert.zone,
          source: alert.source,
          createdAt,
        }
      : null,
  };
}

export function markCommandExecuted(deviceId, {
  commandId,
  clientCommandId,
  siren,
  receivedAt,
  executedAt,
  processDelayUs,
  ntpSynced,
} = {}) {
  const db = getDb();
  let row = null;
  if (commandId) {
    row = db.prepare('SELECT * FROM device_commands WHERE id = ? AND device_id = ?').get(Number(commandId), deviceId);
  }
  if (!row && clientCommandId) {
    row = db.prepare('SELECT * FROM device_commands WHERE client_command_id = ? AND device_id = ?').get(clientCommandId, deviceId);
  }
  if (!row) return null;
  if (row.execution_status === 'EXECUTED') {
    return null;
  }

  const confirmedAt = isoNow();
  const createdAt = toIsoMs(row.created_at);
  const espReceivedAt = receivedAt ? toIsoMs(receivedAt) : null;
  const gpioAt = executedAt ? toIsoMs(executedAt) : null;
  const apiToEspMs = espReceivedAt ? diffMs(createdAt, espReceivedAt) : null;
  const delayUs = processDelayUs == null ? null : Number(processDelayUs);

  db.prepare(`
    UPDATE device_commands
    SET execution_status = 'EXECUTED',
        executed_at = COALESCE(?, executed_at, datetime('now')),
        received_at = COALESCE(?, received_at),
        confirmed_at = ?,
        esp_received_at = COALESCE(?, esp_received_at),
        gpio_at = COALESCE(?, gpio_at),
        process_delay_us = COALESCE(?, process_delay_us),
        api_to_esp_ms = COALESCE(?, api_to_esp_ms)
    WHERE id = ?
  `).run(
    gpioAt,
    espReceivedAt,
    confirmedAt,
    espReceivedAt,
    gpioAt,
    delayUs,
    apiToEspMs,
    row.id
  );
  db.prepare(`
    UPDATE devices
    SET last_command_id = ?, last_command_status = 'EXECUTED'
    WHERE id = ?
  `).run(String(row.id), deviceId);

  console.log(
    `[T4] confirmation API commandId=${row.id} alertId=${row.alert_id || '-'} siren=${siren} createdAt=${createdAt} espReceivedAt=${espReceivedAt || '-'} gpioAt=${gpioAt || '-'} confirmedAt=${confirmedAt} apiToEspMs=${apiToEspMs ?? 'n/a'} gpioDelayUs=${delayUs ?? 'n/a'}`
  );
  if (ntpSynced === false || (apiToEspMs != null && apiToEspMs < -200)) {
    console.warn('[CLOCK] horloges API/ESP probablement décalées — comparer seulement si NTP OK');
  }

  return {
    ...row,
    execution_status: 'EXECUTED',
    createdAt,
    receivedAt: espReceivedAt,
    executedAt: gpioAt,
    confirmedAt,
    apiToEspMs,
    processDelayUs: delayUs,
  };
}

export function touchDevice(deviceId, { siren, alarmSource, activeAlertId, lastIp, listenPort } = {}) {
  const db = getDb();
  const status = 'ONLINE';
  db.prepare(`
    UPDATE devices
    SET last_seen = datetime('now'),
        status = ?,
        siren = COALESCE(?, siren),
        alarm_source = COALESCE(?, alarm_source),
        active_alert_id = COALESCE(?, active_alert_id),
        last_ip = COALESCE(?, last_ip),
        listen_port = COALESCE(?, listen_port)
    WHERE id = ?
  `).run(
    status,
    siren == null ? null : (siren ? 1 : 0),
    alarmSource === undefined ? null : alarmSource,
    activeAlertId === undefined ? null : activeAlertId,
    lastIp || null,
    listenPort == null ? null : Number(listenPort),
    deviceId
  );
}

export function upsertEnvFromTelemetry(device, body) {
  const db = getDb();
  const zone = device.zone;
  const siren = body.siren ? 1 : 0;
  const existing = db.prepare('SELECT id FROM env_conditions WHERE zone = ?').get(zone);
  const air = body.air;

  if (existing) {
    if (air && air.raw != null) {
      db.prepare(`
        UPDATE env_conditions
        SET device_id = ?, temperature = ?, humidity = ?,
            mq2_raw = ?, mq2_threshold = ?, alarm = ?, alarm_source = ?,
            siren = ?, status = ?, updated_at = datetime('now')
        WHERE zone = ?
      `).run(
        device.id,
        body.temperature ?? null,
        body.humidity ?? null,
        air.raw,
        air.threshold ?? null,
        air.alarm ? 1 : 0,
        body.alarmSource || null,
        siren,
        air.alarm ? 'warning' : 'normal',
        zone
      );
    } else {
      db.prepare(`
        UPDATE env_conditions
        SET device_id = ?, siren = ?, alarm_source = ?, updated_at = datetime('now')
        WHERE zone = ?
      `).run(device.id, siren, body.alarmSource || null, zone);
    }
  }
}
