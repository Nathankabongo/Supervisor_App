import express from 'express';
import { SerialPort } from 'serialport';
import { getDb } from '../services/database.js';

const router = express.Router();

// État de la connexion LoRa
let loraState = {
  serialConnected: false,
  port: process.env.LORA_PORT || 'COM3',
  baudRate: parseInt(process.env.BAUD_RATE) || 9600,
  simulatorActive: false,
  detectedDevices: [],
  connectedWatches: [],
  scanInProgress: false,
};

// Références injectées
let serialPortManagerRef = null;
let realTimeDataServiceRef = null;

const pendingCommands = new Map(); // File d'attente de commandes pour WiFi

export function setLoraReferences(serialManager, realTimeManager) {
  serialPortManagerRef = serialManager;
  realTimeDataServiceRef = realTimeManager;
}

// Lister les ports série disponibles
router.get('/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    const formatted = ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || 'Inconnu',
      serialNumber: p.serialNumber || '',
      pnpId: p.pnpId || '',
      vendorId: p.vendorId || '',
      productId: p.productId || '',
    }));
    res.json({ ports: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Impossible de lister les ports série' });
  }
});

// Statut LoRa complet
router.get('/status', (req, res) => {
  res.json({
    simulatorActive: loraState.simulatorActive,
    serialConnected: serialPortManagerRef?.isConnected || false,
    port: loraState.port,
    baudRate: loraState.baudRate,
    connectedWatches: loraState.connectedWatches,
    scanInProgress: loraState.scanInProgress,
    lastUpdate: new Date().toISOString(),
  });
});

// Passerelles LoRa
router.get('/gateways', (req, res) => {
  try {
    const db = getDb();
    const gateways = db.prepare('SELECT * FROM lora_gateways').all();
    res.json({ gateways });
  } catch {
    res.json({ gateways: [] });
  }
});

// Scanner les appareils LoRa à proximité
router.post('/scan', async (req, res) => {
  if (loraState.scanInProgress) {
    return res.status(409).json({ error: 'Scan déjà en cours' });
  }

  loraState.scanInProgress = true;
  console.log('🔍 Scan LoRa en cours...');

  try {
    if (serialPortManagerRef?.isConnected) {
      await serialPortManagerRef.sendData('BROADCAST', 'scan');
      await new Promise(resolve => setTimeout(resolve, 5000));
      loraState.scanInProgress = false;
      return res.json({ devices: loraState.detectedDevices, scanDuration: 5000 });
    }

    loraState.scanInProgress = false;
    return res.json({ devices: [], scanDuration: 0, message: 'Aucune connexion LoRa active' });
  } catch (error) {
    loraState.scanInProgress = false;
    console.error('Erreur scan LoRa:', error);
    return res.status(500).json({ error: 'Erreur lors du scan' });
  }
});

// Connecter un appareil LoRa
router.post('/connect', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId requis' });
  if (loraState.connectedWatches.find(w => w.id === deviceId)) {
    return res.status(409).json({ error: 'Appareil déjà connecté' });
  }

  const detected = loraState.detectedDevices.find(d => d.id === deviceId);
  if (!detected) {
    return res.status(404).json({ error: 'Appareil non détecté. Lancez un scan d\'abord.' });
  }

  const connectedWatch = { ...detected, connectedAt: new Date().toISOString(), status: 'connected' };
  loraState.connectedWatches.push(connectedWatch);
  loraState.detectedDevices = loraState.detectedDevices.filter(d => d.id !== deviceId);
  console.log(`📱 Appareil connecté: ${connectedWatch.name} (${deviceId})`);
  res.json({ success: true, device: connectedWatch });
});

// Déconnecter un appareil
router.post('/disconnect', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId requis' });

  const watch = loraState.connectedWatches.find(w => w.id === deviceId);
  if (!watch) return res.status(404).json({ error: 'Appareil non connecté' });

  loraState.connectedWatches = loraState.connectedWatches.filter(w => w.id !== deviceId);
  console.log(`📱 Appareil déconnecté: ${watch.name} (${deviceId})`);
  res.json({ success: true, message: `${watch.name} déconnecté` });
});

// Envoyer une commande à un appareil
router.post('/command', (req, res) => {
  const { deviceId, command } = req.body;
  if (!deviceId || !command) return res.status(400).json({ error: 'deviceId et command requis' });

  console.log(`📡 Commande envoyée à ${deviceId}: ${command}`);

  // 1. Envoyer par port série / LoRa si connecté
  if (serialPortManagerRef?.isConnected) {
    serialPortManagerRef.sendData(deviceId, command)
      .then(() => res.json({ success: true, message: 'Commande envoyée via LoRa' }))
      .catch(err => res.status(500).json({ error: err.message }));
    return;
  }

  // 2. Mettre en file d'attente pour WiFi / HTTP Polling
  if (!pendingCommands.has(deviceId)) {
    pendingCommands.set(deviceId, []);
  }
  pendingCommands.get(deviceId).push({ command, timestamp: Date.now() });

  res.json({ success: true, message: 'Commande mise en attente (WiFi / Simulateur)' });
});

// Endpoint pour recevoir les données de la montre par HTTP (WiFi)
router.post('/data', (req, res) => {
  const data = req.body;
  if (!data || !data.type || !data.minerId) {
    return res.status(400).json({ error: 'Données invalides (type ou minerId requis)' });
  }

  console.log(`📶 WiFi: Données reçues de ${data.minerId} (type: ${data.type})`);

  // Pousser au service temps réel
  if (realTimeDataServiceRef) {
    realTimeDataServiceRef.processLoRaData(data);
  }

  // Connecter automatiquement l'appareil si non présent dans la liste
  if (!loraState.connectedWatches.find(w => w.id === data.minerId)) {
    const db = getDb();
    const miner = db.prepare('SELECT name FROM miners WHERE watch_id = ?').get(data.minerId) || db.prepare('SELECT name FROM miners WHERE id = ?').get(data.minerId);
    const displayName = miner ? `T-Watch S3+ - ${miner.name}` : `T-Watch S3+ - ${data.minerId}`;

    loraState.connectedWatches.push({
      id: data.minerId,
      name: displayName,
      type: 'twatch',
      rssi: -55,
      battery: data.battery || 100,
      zone: data.zone || 'ZONE A',
      connectedAt: new Date().toISOString(),
      status: 'connected',
      connectionType: 'wifi'
    });
  }

  // Récupérer et vider les commandes en attente pour cette montre
  const commands = pendingCommands.get(data.minerId) || [];
  pendingCommands.delete(data.minerId);

  res.json({ 
    success: true, 
    commands: commands.map(c => c.command)
  });
});

// Statut du port série
router.get('/serial-status', (req, res) => {
  res.json({
    connected: serialPortManagerRef?.isConnected || false,
    port: loraState.port,
    baudRate: loraState.baudRate,
  });
});

export default router;
