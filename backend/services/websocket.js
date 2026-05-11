export class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.clients = new Map();
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
    // Log pour vérifier l'envoi (désactiver en production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📍 Location update: ${data.minerId} zone=${data.zone} pos=(${data.position?.x},${data.position?.y})`);
    }
  }

  broadcastNotification(notification) {
    this.io.emit('notification', notification);
  }
}
