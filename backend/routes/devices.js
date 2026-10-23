import express from 'express';
import { authUser, requireAdmin } from '../middleware/authUser.js';
import { authDevice } from '../middleware/authDevice.js';
import { provisionDevice, revokeDevice } from '../services/deviceAuthService.js';
import {
  consumePendingCommands,
  enqueueCommand,
  getDevice,
  getSirenSyncState,
  listDevices,
  mapDevicePublic,
  markCommandExecuted,
  touchDevice,
  upsertEnvFromTelemetry,
} from '../services/deviceCommandService.js';
import { getDb } from '../services/database.js';

const router = express.Router();

let realTimeDataService = null;
let websocketManager = null;

export function setDeviceReferences(rt, ws) {
  realTimeDataService = rt;
  websocketManager = ws;
}

function envSnapshot(zone) {
  const db = getDb();
  return db.prepare('SELECT * FROM env_conditions WHERE zone = ?').get(zone) || null;
}

function publicStatus(deviceRow) {
  const mapped = mapDevicePublic(deviceRow);
  const env = envSnapshot(deviceRow.zone);
  return {
    deviceId: mapped.id,
    zone: mapped.zone,
    gallery: mapped.gallery,
    status: mapped.status,
    lastSeen: mapped.lastSeen,
    siren: mapped.siren,
    lastCommandId: mapped.lastCommandId,
    lastCommandStatus: mapped.lastCommandStatus,
    lastAction: mapped.alarmSource,
    activeAlertId: mapped.activeAlertId,
    air: {
      sensorType: 'MQ2',
      raw: env?.mq2_raw ?? null,
      threshold: env?.mq2_threshold ?? null,
      alarm: env?.alarm === 1,
    },
    temperature: env?.temperature ?? null,
    humidity: env?.humidity ?? null,
  };
}

router.post('/', authUser, requireAdmin, (req, res) => {
  const { id, zone, gallery } = req.body || {};
  if (!id || !zone) {
    return res.status(400).json({ error: 'id et zone requis' });
  }
  const result = provisionDevice({ id, zone, gallery });
  if (result.error === 'conflict') {
    return res.status(409).json({ error: result.message });
  }
  res.status(201).json({ device: result.device, deviceToken: result.deviceToken });
});

router.get('/', authUser, (req, res) => {
  res.json({ devices: listDevices() });
});

router.get('/:deviceId/status', authUser, (req, res) => {
  const device = getDevice(req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Appareil introuvable' });
  res.json(publicStatus(device));
});

router.post('/:deviceId/revoke', authUser, requireAdmin, (req, res) => {
  if (!revokeDevice(req.params.deviceId)) {
    return res.status(404).json({ error: 'Appareil introuvable' });
  }
  res.json({ ok: true });
});

router.post('/:deviceId/commands', authUser, (req, res) => {
  const { action, clientCommandId, message } = req.body || {};
  if (!action || !clientCommandId) {
    return res.status(400).json({ error: 'action et clientCommandId requis' });
  }
  if (!['ACTIVATE_SIREN', 'DEACTIVATE_SIREN'].includes(action)) {
    return res.status(400).json({ error: 'action invalide' });
  }
  const device = getDevice(req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Appareil introuvable' });

  const result = enqueueCommand({
    deviceId: device.id,
    action,
    clientCommandId,
    message,
    alertId: req.body?.alertId || null,
    source: req.body?.source || 'MANUAL',
  });
  res.json({
    ok: true,
    commandId: result.commandId,
    duplicate: result.duplicate,
    alertId: req.body?.alertId || null,
    deviceId: device.id,
    zoneId: device.zone,
    command: action,
    source: req.body?.source || 'MANUAL',
    timestamp: new Date().toISOString(),
    createdAt: result.createdAt || new Date().toISOString(),
    status: result.duplicate ? 'QUEUED' : 'QUEUED',
  });
});

router.get('/:deviceId/commands', authDevice, (req, res) => {
  touchDevice(req.device.id, {});
  const autoAck = String(req.query.ack || '1') !== '0';
  const commands = consumePendingCommands(req.device.id, autoAck);
  const sync = getSirenSyncState(req.device);
  res.json({
    ok: true,
    commands,
    desiredSiren: sync.desiredSiren,
    siren: sync.desiredSiren,
    alert: sync.alert,
  });
});

router.post('/:deviceId/telemetry', authDevice, (req, res) => {
  const device = req.device;
  const body = req.body || {};

  touchDevice(device.id, {
    siren: body.siren,
    alarmSource: body.alarmSource || null,
    activeAlertId: body.alertId || undefined,
    lastIp: body.ip || body.lastIp || null,
    listenPort: body.listenPort || body.port || null,
  });
  upsertEnvFromTelemetry(device, body);

  if (body.lastCommandId || body.lastClientCommandId) {
    const executed = markCommandExecuted(device.id, {
      commandId: body.lastCommandId,
      clientCommandId: body.lastClientCommandId,
      siren: body.siren,
      receivedAt: body.receivedAt,
      executedAt: body.executedAt || body.gpioAt,
      processDelayUs: body.processDelayUs,
      ntpSynced: body.ntpSynced,
    });
    if (websocketManager && executed) {
      websocketManager.broadcast('siren-executed', {
        deviceId: device.id,
        zone: device.zone,
        alertId: executed.alert_id,
        commandId: String(executed.id),
        clientCommandId: executed.client_command_id,
        action: executed.action,
        siren: !!body.siren,
        status: 'EXECUTED',
        createdAt: executed.createdAt,
        receivedAt: executed.receivedAt,
        executedAt: executed.executedAt,
        confirmedAt: executed.confirmedAt,
        apiToEspMs: executed.apiToEspMs,
        processDelayUs: executed.processDelayUs,
        ntpSynced: body.ntpSynced !== false,
        timestamp: executed.confirmedAt,
      });
    }
  }

  /* Phase sirène distante : pas d'incident MQ-2 depuis la télémétrie. */
  const fresh = getDevice(device.id);
  const pendingCommands = consumePendingCommands(device.id, true);
  const statusPayload = publicStatus(fresh);
  const sync = getSirenSyncState(fresh || device);

  if (websocketManager) {
    websocketManager.broadcast('device-status', statusPayload);
    websocketManager.broadcast('zone-update', {
      zone: device.zone,
      ...statusPayload,
    });
  }

  res.json({
    ok: true,
    status: statusPayload.status,
    lastSeen: statusPayload.lastSeen,
    pendingCommands,
    desiredSiren: sync.desiredSiren,
    siren: sync.desiredSiren,
    alert: sync.alert,
  });
});

router.post('/:deviceId/alerts', authDevice, (req, res) => {
  if (!realTimeDataService) {
    return res.status(503).json({ error: 'Service temps réel indisponible' });
  }
  const body = req.body || {};
  const result = realTimeDataService.createAlertFromDevice({
    clientEventId: body.clientEventId,
    deviceId: req.device.id,
    zone: body.zone || req.device.zone,
    source: body.source || 'GAS_SENSOR',
    type: body.type || 'gas',
    severity: body.severity || 'high',
    sensorType: body.sensorType || 'MQ2',
    sensorRaw: body.sensorRaw,
    threshold: body.threshold,
    siren: body.siren !== false,
    message: body.message,
  });
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.status(result.created ? 201 : 200).json({ ok: true, created: result.created, alert: result.alert });
});

export default router;
