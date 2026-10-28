import { gpsToLocalMap } from '../utils/gps.js';
import { ackMessageInDb } from '../routes/data.js';

let referenceLocation = null;

function mapGpsToMapCoords(location) {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return { x: 500, y: 250, zone: 'ZONE B', validGps: false };
  }
  return gpsToLocalMap(location.lat, location.lng);
}

function getZoneForCoords(x, y) {
  if (y < 250) {
    if (x < 333) return 'ZONE A';
    if (x < 666) return 'ZONE B';
    return 'ZONE C';
  } else {
    if (x < 333) return 'ZONE D';
    if (x < 666) return 'ZONE E';
    return 'ZONE F';
  }
}

export class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.clients = new Map();
    this.realTimeDataService = null;
  }

  setRealTimeDataService(service) {
    this.realTimeDataService = service;
  }

  handleConnection(socket) {
    this.clients.set(socket.id, socket);

    socket.on('disconnect', () => {
      this.clients.delete(socket.id);
      console.log('Client disconnected:', socket.id);
    });

    socket.on('subscribe-miner', (minerId) => {
      socket.join(`miner-${minerId}`);
    });

    socket.on('unsubscribe-miner', (minerId) => {
      socket.leave(`miner-${minerId}`);
    });

    socket.on('subscribe-alerts', () => {
      socket.join('alerts');
    });

    socket.on('unsubscribe-alerts', () => {
      socket.leave('alerts');
    });

    // --- Watch Integration Events ---
    socket.on('watch-register', (data) => {
      const minerId = data.minerId;
      socket.minerId = minerId;
      console.log(`⌚ Watch registered for miner: ${minerId}`);
      socket.emit('watch-registered', { minerId });
    });

    socket.on('watch-data', (data) => {
      console.log(`⌚ Watch telemetry from ${data.minerId}: HR=${data.heartRate} SOS=${data.sos}`);
      
      // Map GPS to Map X/Y
      const coords = mapGpsToMapCoords(data.location);
      
      if (this.realTimeDataService) {
        // 1. Send Location Update
        this.realTimeDataService.processLoRaData({
          type: 'location',
          minerId: data.minerId,
          name: data.minerName,
          x: coords.x,
          y: coords.y,
          lat: data.location?.lat,
          lng: data.location?.lng,
          latitude: data.location?.lat,
          longitude: data.location?.lng,
          motion: data.motion || (data.immobile ? 'still' : 'walking'),
          zone: coords.zone,
          battery: data.battery,
          rssi: -50,
          connectionType: 'wifi'
        });

        // 2. Send Status Update
        this.realTimeDataService.processLoRaData({
          type: 'status',
          minerId: data.minerId,
          status: data.sos ? 'danger' : data.danger ? 'warning' : 'safe',
          heartRate: data.heartRate,
          seismicHz: data.seismicHz,
          toxicGasLevel: data.toxicGasLevel,
          connectionType: 'wifi'
        });

        // 3. Send Health Update
        this.realTimeDataService.processLoRaData({
          type: 'health',
          minerId: data.minerId,
          heartRate: data.heartRate,
          healthData: {
            heartRate: data.heartRate,
            temperature: 36.5,
            oxygenLevel: 98,
            bloodPressure: '120/80'
          }
        });

        // 4. Pas d'alerte via la télémétrie périodique — uniquement via 'sos-alert' ou POST /api/watch/sos
      }
    });

    socket.on('sos-alert', (data) => {
      console.log(`🚨 SOS button clicked on watch for miner: ${data.minerId}`);
      if (this.realTimeDataService) {
        const miner = this.realTimeDataService.miners.get(data.minerId);
        let zone = miner ? miner.zone : 'ZONE B';
        if (data.lat && data.lng) {
          zone = gpsToLocalMap(data.lat, data.lng).zone;
        }
        const isImmobility = data.type === 'IMMOBILITY' || data.alertType === 'immobility' || data.type === 'STILL';
        const isFall = data.type === 'FALL' || data.alertType === 'fall';
        
        // Broadcast Alert
        this.realTimeDataService.processLoRaData({
          type: 'alert',
          minerId: data.minerId,
          minerName: data.minerName,
          alertType: isImmobility ? 'immobility' : (isFall ? 'fall' : 'emergency'),
          severity: 'high',
          message: isImmobility ? 'Immobilité prolongée détectée' : (isFall ? 'Chute détectée' : 'Bouton SOS activé'),
          zone: zone,
          ...(data.heartRate != null ? { heartRate: data.heartRate } : {}),
          ...(data.seismicHz != null ? { seismicHz: data.seismicHz } : {}),
        });

        // Update Status to danger
        this.realTimeDataService.processLoRaData({
          type: 'status',
          minerId: data.minerId,
          status: 'danger',
          ...(data.heartRate != null ? { heartRate: data.heartRate } : {}),
          ...(data.seismicHz != null ? { seismicHz: data.seismicHz } : {}),
        });
      }
    });

    socket.on('message-ack', (data) => {
      console.log(`⌚ Ack received from watch for message ${data.messageId} by miner ${data.minerId}`);
      ackMessageInDb(data.messageId, data.minerId);
    });
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  broadcastMinerUpdate(minerId, data) {
    this.io.to(`miner-${minerId}`).emit('miner-update', data);
  }

  broadcastAlert(alert) {
    this.io.to('alerts').emit('new-alert', alert);
    this.io.emit('alert-popup', alert);
  }

  broadcastLocationUpdate(data) {
    this.io.emit('location-update', data);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📍 Location update: ${data.minerId} zone=${data.zone} pos=(${data.position?.x},${data.position?.y})`);
    }
  }

  broadcastNotification(notification) {
    this.io.emit('notification', notification);
  }
}
