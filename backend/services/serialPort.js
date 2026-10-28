import { SerialPort } from 'serialport';

const MESSAGE_DELIMITER = '\n'; // Délimiteur de fin de message LoRa
const MAX_BUFFER_SIZE = 1024 * 10; // 10KB max buffer

export class SerialPortManager {
  constructor(onData) {
    this.port = null;
    this.isConnected = false;
    this.buffer = '';          // Tampon d'accumulation
    this.onData = onData;     // Callback pour données parsées
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async start() {
    const path = (process.env.LORA_PORT || '').trim();
    const disabled = !path || /^(none|off|disabled)$/i.test(path);
    const windowsComOnLinux = process.platform !== 'win32' && /^COM\d+$/i.test(path);

    if (disabled || windowsComOnLinux) {
      console.log(
        windowsComOnLinux
          ? `LoRa USB ignoré (${path}) : chemin Windows, inutile ici. SOS montre = WiFi HTTP, pas COM3.`
          : 'LoRa USB désactivé (LORA_PORT vide). SOS montre via POST /api/watch/sos.'
      );
      return;
    }

    try {
      const portConfig = {
        path,
        baudRate: parseInt(process.env.BAUD_RATE) || 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      };

      this.port = new SerialPort(portConfig);

      this.port.on('open', () => {
        console.log(`Port série ${portConfig.path} ouvert`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.port.on('data', (data) => {
        this.handleIncomingData(data);
      });

      this.port.on('error', (err) => {
        console.error('Erreur port série:', err.message);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.port.on('close', () => {
        console.log('Port série fermé');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      await this.port.open();
    } catch (error) {
      console.error('Impossible d\'ouvrir le port série:', error.message);
      this.scheduleReconnect();
    }
  }

  handleIncomingData(data) {
    try {
      // Accumuler les données dans le tampon
      this.buffer += data.toString('utf8');

      // Limiter la taille du tampon
      if (this.buffer.length > MAX_BUFFER_SIZE) {
        console.warn('Tampon série trop grand, réinitialisation');
        this.buffer = '';
        return;
      }

      // Traiter les messages complets (séparés par le délimiteur)
      let delimiterIndex;
      while ((delimiterIndex = this.buffer.indexOf(MESSAGE_DELIMITER)) !== -1) {
        const message = this.buffer.substring(0, delimiterIndex).trim();
        this.buffer = this.buffer.substring(delimiterIndex + 1);

        if (message.length > 0) {
          const parsedData = this.parseLoRaMessage(message);
          if (parsedData && this.onData) {
            this.onData(parsedData);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement des données LoRa:', error);
    }
  }

  parseLoRaMessage(message) {
    if (!message || typeof message !== 'string') return null;
    const trimmed = message.trim();

    // 1. Essayer le format JSON standard
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type && (parsed.minerId || parsed.workerId)) {
          return parsed;
        }
      } catch (e) {}
    }

    // 2. Format trame texte pipe-separated (comme généré par lora_service.cpp)
    // Types : SOS|M001|battery|lat|lng
    //         FALL|M001|battery|lat|lng
    //         IMMOBILITY|M001|battery|lat|lng
    //         HB|M001|battery
    //         DATA|M001|battery|lat|lng|motion|steps|temp
    const parts = trimmed.split('|');
    if (parts.length >= 2) {
      const msgType = parts[0].toUpperCase();
      const workerId = parts[1].trim();

      if (msgType === 'SOS') {
        const battery = parts[2] ? parseFloat(parts[2]) : 100;
        const lat = parts[3] ? parseFloat(parts[3]) : null;
        const lng = parts[4] ? parseFloat(parts[4]) : null;
        return {
          type: 'alert',
          alertType: 'emergency',
          minerId: workerId,
          battery,
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          message: 'Bouton SOS activé (LoRa)',
          connectionType: 'lora'
        };
      }

      if (msgType === 'FALL') {
        const battery = parts[2] ? parseFloat(parts[2]) : 100;
        const lat = parts[3] ? parseFloat(parts[3]) : null;
        const lng = parts[4] ? parseFloat(parts[4]) : null;
        return {
          type: 'alert',
          alertType: 'fall',
          minerId: workerId,
          battery,
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          message: 'Chute détectée (LoRa)',
          connectionType: 'lora'
        };
      }

      if (msgType === 'IMMOBILITY' || msgType === 'STILL') {
        const battery = parts[2] ? parseFloat(parts[2]) : 100;
        const lat = parts[3] ? parseFloat(parts[3]) : null;
        const lng = parts[4] ? parseFloat(parts[4]) : null;
        return {
          type: 'alert',
          alertType: 'immobility',
          minerId: workerId,
          battery,
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          message: 'Immobilité prolongée détectée (LoRa)',
          connectionType: 'lora'
        };
      }

      if (msgType === 'HB') {
        const battery = parts[2] ? parseFloat(parts[2]) : 100;
        return {
          type: 'location',
          minerId: workerId,
          battery,
          connectionType: 'lora'
        };
      }

      if (msgType === 'DATA') {
        const battery = parts[2] ? parseFloat(parts[2]) : 100;
        const lat = parts[3] ? parseFloat(parts[3]) : null;
        const lng = parts[4] ? parseFloat(parts[4]) : null;
        const motion = parts[5] || 'still';
        return {
          type: 'location',
          minerId: workerId,
          battery,
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          motion,
          connectionType: 'lora'
        };
      }
    }

    console.warn('Message LoRa non reconnu:', trimmed);
    return null;
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Tentative de reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        if (this.port) {
          this.port.close();
        }
        await this.start();
      } catch (err) {
        console.error('Échec de la reconnexion:', err.message);
      }
    }, delay);
  }

  async sendData(deviceId, command) {
    if (!this.isConnected || !this.port) {
      throw new Error('Port série non connecté');
    }

    const message = JSON.stringify({
      deviceId,
      command,
      timestamp: Date.now()
    }) + MESSAGE_DELIMITER;

    return new Promise((resolve, reject) => {
      this.port.write(message, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.port) {
      try {
        this.port.close();
      } catch (e) {
        // Ignorer les erreurs de fermeture
      }
    }
    this.isConnected = false;
    this.buffer = '';
  }
}
