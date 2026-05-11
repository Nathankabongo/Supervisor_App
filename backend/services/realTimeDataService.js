const MAX_ALERTS = 500;
const MAX_NOTIFICATIONS = 200;
const ALERT_TTL = 24 * 60 * 60 * 1000; // 24h
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1h

export class RealTimeDataService {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.miners = new Map();
    this.alerts = [];
    this.notifications = [];
    this.cleanupTimer = null;
    this.startCleanup();
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  cleanup() {
    const now = Date.now();

    // Supprimer les alertes résolues de plus de 24h
    this.alerts = this.alerts.filter(a => {
      if (a.resolved && (now - a.timestamp) > ALERT_TTL) return false;
      return true;
    });

    // Limiter le nombre d'alertes
    if (this.alerts.length > MAX_ALERTS) {
      this.alerts = this.alerts.slice(-MAX_ALERTS);
    }

    // Supprimer les notifications lues de plus de 24h
    this.notifications = this.notifications.filter(n => {
      if (n.read && (now - n.timestamp) > ALERT_TTL) return false;
      return true;
    });

    // Limiter le nombre de notifications
    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(-MAX_NOTIFICATIONS);
    }
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      this.websocketManager.broadcast({
        type: 'alert-resolved',
        alertId: alertId
      });
    }
  }

  createNotification(notificationData) {
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notificationData,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.push(notification);
    this.websocketManager.broadcastNotification(notification);
  }

  getMiners() {
    return Array.from(this.miners.values());
  }

  getAlerts() {
    return this.alerts;
  }

  getUnresolvedAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  getNotifications() {
    return this.notifications;
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  processLoRaData(data) {
    if (!data || !data.type) {
      console.warn('Données LoRa invalides:', data);
      return;
    }

    switch (data.type) {
      case 'location':
        this.updateMinerLocation(data);
        break;
      case 'alert':
        this.createAlertFromWatch(data);
        break;
      case 'status':
        this.updateMinerStatus(data);
        break;
      case 'health':
        this.processHealthData(data);
        break;
      case 'ack':
        console.log(`ACK reçu de ${data.minerId}: ${data.commandId}`);
        break;
      default:
        console.warn('Type de données LoRa inconnu:', data.type);
    }
  }

  updateMinerLocation(data) {
    // Stocker les données complètes du mineur
    const existing = this.miners.get(data.minerId) || {};
    const minerData = {
      ...existing,
      id: data.minerId,
      name: data.name || existing.name,
      position: { x: data.x, y: data.y, timestamp: Date.now() },
      zone: data.zone,
      battery: data.battery,
      rssi: data.rssi,
      lastUpdate: Date.now()
    };
    this.miners.set(data.minerId, minerData);
    
    // Diffuser la mise à jour de localisation
    this.websocketManager.broadcastLocationUpdate({
      type: 'location-update',
      minerId: data.minerId,
      name: minerData.name,
      position: minerData.position,
      zone: data.zone,
      battery: data.battery,
      rssi: data.rssi,
      timestamp: Date.now()
    });
  }

  createAlertFromWatch(data) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      minerId: data.minerId,
      minerName: data.minerName || data.minerId,
      type: data.alertType,
      severity: data.severity,
      message: data.message,
      zone: data.zone,
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.push(alert);
    this.websocketManager.broadcastAlert(alert);
  }

  updateMinerStatus(data) {
    const miner = this.miners.get(data.minerId);
    if (miner) {
      miner.status = data.status;
      miner.lastUpdate = Date.now();
      
      this.websocketManager.broadcast({
        type: 'miner-status-update',
        minerId: data.minerId,
        status: data.status
      });
    }
  }

  processHealthData(data) {
    this.websocketManager.broadcast({
      type: 'health-update',
      minerId: data.minerId,
      healthData: data.healthData
    });
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
