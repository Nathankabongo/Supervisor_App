import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore, Miner, Alert, AlertType } from '../store/useStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface LocationUpdateData {
  type: 'location-update';
  minerId: string;
  name: string;
  position: { x: number; y: number; timestamp: number };
  zone: string;
  battery: number;
  rssi: number;
  timestamp: number;
}

interface MinerStatusUpdateData {
  type: 'miner-status-update';
  minerId: string;
  status: 'safe' | 'warning' | 'danger';
  heartRate?: number;
  temperature?: number;
  steps?: number;
}

interface HealthUpdateData {
  type: 'health-update';
  minerId: string;
  healthData: {
    heartRate: number;
    temperature: number;
    oxygenLevel: number;
    bloodPressure: string;
  };
}

interface AlertData {
  id: string;
  minerId: string;
  minerName: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  zone: string;
  timestamp: number;
  resolved: boolean;
}

interface AlertResolvedData {
  type: 'alert-resolved';
  alertId: string;
}

interface NotificationData {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export function useRealtimeConnection() {
  const socketRef = useRef<Socket | null>(null);
  const { updateMiner, addAlert, resolveAlert, setMiners } = useStore();
  const knownMiners = useRef(new Map<string, Miner>());

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('Connecté au serveur WebSocket');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Déconnecté du serveur WebSocket');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error);
    });

    // Localisation en temps réel depuis la montre
    socketRef.current.on('location-update', (data: LocationUpdateData) => {
      const existingMiner = knownMiners.current.get(data.minerId);
      
      const minerUpdate: Partial<Miner> & { id: string } = {
        id: data.minerId,
        name: data.name || (existingMiner?.name || data.minerId),
        position: data.position,
        currentZone: data.zone.replace('ZONE ', ''),
        trajectory: existingMiner 
          ? [...existingMiner.trajectory.slice(-20), data.position]
          : [data.position],
      };

      knownMiners.current.set(data.minerId, {
        ...existingMiner,
        ...minerUpdate
      } as Miner);

      updateMiner(data.minerId, minerUpdate);

      // Mettre à jour la liste complète des mineurs dans le store
      setMiners(Array.from(knownMiners.current.values()));
    });

    // Mise à jour du statut du mineur
    socketRef.current.on('miner-status-update', (data: MinerStatusUpdateData) => {
      const existingMiner = knownMiners.current.get(data.minerId);
      if (existingMiner) {
        const updated = {
          ...existingMiner,
          status: data.status,
          heartRate: data.heartRate || existingMiner.heartRate,
          activityLevel: data.steps ? Math.min(100, data.steps / 30) : existingMiner.activityLevel,
        };
        knownMiners.current.set(data.minerId, updated);
        updateMiner(data.minerId, { status: data.status, heartRate: data.heartRate });
        setMiners(Array.from(knownMiners.current.values()));
      }
    });

    // Données de santé
    socketRef.current.on('health-update', (data: HealthUpdateData) => {
      const existingMiner = knownMiners.current.get(data.minerId);
      if (existingMiner) {
        updateMiner(data.minerId, {
          heartRate: data.healthData.heartRate,
        });
      }
    });

    // Nouvelles alertes
    socketRef.current.on('new-alert', (alert: AlertData) => {
      addAlert(alert as Alert);
    });

    // Alertes popup
    socketRef.current.on('alert-popup', (alert: AlertData) => {
      addAlert(alert as Alert);
    });

    // Alerte résolue
    socketRef.current.on('alert-resolved', (data: AlertResolvedData) => {
      resolveAlert(data.alertId);
    });

    // Notifications
    socketRef.current.on('notification', (notification: NotificationData) => {
      console.log('Nouvelle notification:', notification);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [updateMiner, addAlert, resolveAlert, setMiners]);

  const subscribeToMiner = (minerId: string) => {
    socketRef.current?.emit('subscribe-miner', minerId);
  };

  const unsubscribeFromMiner = (minerId: string) => {
    socketRef.current?.emit('unsubscribe-miner', minerId);
  };

  const subscribeToAlerts = () => {
    socketRef.current?.emit('subscribe-alerts');
  };

  const unsubscribeFromAlerts = () => {
    socketRef.current?.emit('unsubscribe-alerts');
  };

  return {
    connected: socketRef.current?.connected || false,
    subscribeToMiner,
    unsubscribeFromMiner,
    subscribeToAlerts,
    unsubscribeFromAlerts
  };
}
