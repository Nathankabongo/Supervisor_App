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
let loraSimulatorRef = null;
let serialPortManagerRef = null;

export function setLoraReferences(simulator, serialManager) {
  loraSimulatorRef = simulator;
  serialPortManagerRef = serialManager;
  loraState.simulatorActive = !!simulator;
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
    if (loraState.simulatorActive) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const simulatedDevices = [
        { id: 'MIN-001', name: 'T-Watch S3+ - Amadou', type: 'twatch', rssi: -45, battery: 85, zone: 'ZONE A' },
        { id: 'MIN-002', name: 'T-Watch S3+ - Ibrahim', type: 'twatch', rssi: -58, battery: 67, zone: 'ZONE A' },
        { id: 'MIN-003', name: 'T-Watch S3+ - Mamadou', type: 'twatch', rssi: -62, battery: 92, zone: 'ZONE B' },
        { id: 'MIN-004', name: 'T-Watch S3+ - Ousmane', type: 'twatch', rssi: -71, battery: 45, zone: 'ZONE B' },
        { id: 'MIN-005', name: 'T-Watch S3+ - Cheikh', type: 'twatch', rssi: -55, battery: 78, zone: 'ZONE C' },
        { id: 'MIN-006', name: 'T-Watch S3+ - Abdoulaye', type: 'twatch', rssi: -80, battery: 90, zone: 'ZONE C' },
        { id: 'MIN-007', name: 'T-Watch S3+ - Moussa', type: 'twatch', rssi: -48, battery: 72, zone: 'ZONE D' },
        { id: 'MIN-008', name: 'T-Watch S3+ - Samba', type: 'twatch', rssi: -65, battery: 33, zone: 'ZONE D' },
        { id: 'MIN-009', name: 'T-Watch S3+ - Boubacar', type: 'twatch', rssi: -52, battery: 88, zone: 'ZONE E' },
        { id: 'MIN-010', name: 'T-Watch S3+ - Lamine', type: 'twatch', rssi: -73, battery: 56, zone: 'ZONE E' },
        { id: 'MIN-011', name: 'T-Watch S3+ - Pape', type: 'twatch', rssi: -60, battery: 81, zone: 'ZONE F' },
        { id: 'MIN-012', name: 'T-Watch S3+ - Aliou', type: 'twatch', rssi: -68, battery: 64, zone: 'ZONE F' },
      ];

      const newDevices = simulatedDevices.filter(
        d => !loraState.connectedWatches.find(c => c.id === d.id)
      );

      loraState.detectedDevices = newDevices;
      loraState.scanInProgress = false;
      console.log(`🔍 Scan terminé: ${newDevices.length} appareil(s) détecté(s)`);
      return res.json({ devices: newDevices, scanDuration: 2000 });
    }

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
  const { deviceId, name } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId requis' });
  if (loraState.connectedWatches.find(w => w.id === deviceId)) {
    return res.status(409).json({ error: 'Appareil déjà connecté' });
  }

  const detected = loraState.detectedDevices.find(d => d.id === deviceId);
  if (!detected && !loraState.simulatorActive) {
    return res.status(404).json({ error: 'Appareil non détecté. Lancez un scan d\'abord.' });
  }

  const watch = detected || {
    id: deviceId, name: name || `T-Watch S3+ - ${deviceId}`,
    type: 'twatch', rssi: -60, battery: 75, zone: 'ZONE A',
  };

  const connectedWatch = { ...watch, connectedAt: new Date().toISOString(), status: 'connected' };
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

  if (serialPortManagerRef?.isConnected) {
    serialPortManagerRef.sendData(deviceId, command)
      .then(() => res.json({ success: true, message: 'Commande envoyée' }))
      .catch(err => res.status(500).json({ error: err.message }));
    return;
  }
  res.json({ success: true, message: 'Commande envoyée (simulateur)' });
});

// Basculer simulateur / mode réel
router.post('/toggle-mode', (req, res) => {
  const { useSimulator } = req.body;

  if (useSimulator && loraSimulatorRef) {
    loraSimulatorRef.start();
    loraState.simulatorActive = true;
    if (serialPortManagerRef) serialPortManagerRef.stop();
    console.log('🔄 Mode simulateur activé');
  } else if (!useSimulator) {
    if (loraSimulatorRef) loraSimulatorRef.stop();
    loraState.simulatorActive = false;
    if (serialPortManagerRef) {
      serialPortManagerRef.start().catch(err => console.warn('Port série non disponible:', err.message));
    }
    console.log('🔄 Mode réel activé');
  }

  res.json({
    success: true,
    simulatorActive: loraState.simulatorActive,
    serialConnected: serialPortManagerRef?.isConnected || false,
  });
});

// Statut du port série
router.get('/serial-status', (req, res) => {
  res.json({
    connected: serialPortManagerRef?.isConnected || false,
    port: loraState.port,
    baudRate: loraState.baudRate,
    simulatorActive: loraState.simulatorActive,
  });
});

export default router;
