import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { generateMockMiners, generateMockAlerts, updateMinerPosition } from '../utils/mockData';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useRealtimeSimulation() {
  const setMiners = useStore((state) => state.setMiners);
  const setAlerts = useStore((state) => state.setAlerts);
  const updateMiner = useStore((state) => state.updateMiner);
  const addAlert = useStore((state) => state.addAlert);
  const resolveAlert = useStore((state) => state.resolveAlert);
  const isRealtime = useStore((state) => state.isRealtime);
  const initialized = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const backendConnected = useRef(false);
  const knownMiners = useRef(new Map());
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock simulation fallback
  const updateMiners = useCallback(() => {
    if (backendConnected.current) return; // Ne pas simuler si le backend est connecté

    const currentMiners = useStore.getState().miners;
    
    currentMiners.forEach((miner) => {
      const updatedMiner = updateMinerPosition(miner);
      updateMiner(miner.id, updatedMiner);
    });

    if (Math.random() < 0.05) {
      const randomMiner = currentMiners[Math.floor(Math.random() * currentMiners.length)];
      const newAlert = {
        id: `alert-${Date.now()}`,
        minerId: randomMiner.id,
        minerName: randomMiner.name,
        type: ['fall', 'immobility', 'gas', 'emergency'][Math.floor(Math.random() * 4)] as any,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        timestamp: Date.now(),
        resolved: false,
      };
      addAlert(newAlert);
    }
  }, [updateMiner, addAlert]);

  useEffect(() => {
    // Initialize mock data only once
    if (!initialized.current) {
      const initialMiners = generateMockMiners(40);
      const initialAlerts = generateMockAlerts(initialMiners, 5);
      setMiners(initialMiners);
      setAlerts(initialAlerts);
      initialized.current = true;
    }

    // Try to connect to backend WebSocket
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connecté au backend - données en temps réel actives');
      backendConnected.current = true;
      
      // Arrêter la simulation mock
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
        mockIntervalRef.current = null;
      }
    });

    socket.on('disconnect', () => {
      console.log('Déconnecté du backend - simulation mock active');
      backendConnected.current = false;
      
      // Redémarrer la simulation mock
      if (!mockIntervalRef.current && isRealtime) {
        mockIntervalRef.current = setInterval(() => {
          if (!backendConnected.current) updateMiners();
        }, 3000);
      }
    });

    socket.on('connect_error', () => {
      // Backend non disponible, utiliser la simulation mock
      backendConnected.current = false;
    });

    // Écouter les données de localisation depuis la montre
    socket.on('location-update', (data: any) => {
      const existing = knownMiners.current.get(data.minerId);
      const minerData = {
        id: data.minerId,
        name: data.name || (existing?.name || data.minerId),
        matricule: existing?.matricule || data.minerId,
        role: existing?.role || 'Mineur',
        status: existing?.status || 'safe',
        currentZone: data.zone?.replace('ZONE ', '') || 'A',
        currentGallery: existing?.currentGallery || 'Galerie 1',
        position: data.position || { x: data.x, y: data.y, timestamp: Date.now() },
        trajectory: existing 
          ? [...(existing.trajectory || []).slice(-20), data.position || { x: data.x, y: data.y, timestamp: Date.now() }]
          : [data.position || { x: data.x, y: data.y, timestamp: Date.now() }],
        heartRate: existing?.heartRate || 72,
        activityLevel: existing?.activityLevel || 50,
      };

      knownMiners.current.set(data.minerId, minerData);
      updateMiner(data.minerId, minerData);
      setMiners(Array.from(knownMiners.current.values()));
    });

    // Écouter les mises à jour de statut
    socket.on('miner-status-update', (data: any) => {
      const existing = knownMiners.current.get(data.minerId);
      if (existing) {
        const updated = { ...existing, status: data.status, heartRate: data.heartRate || existing.heartRate };
        knownMiners.current.set(data.minerId, updated);
        updateMiner(data.minerId, { status: data.status, heartRate: data.heartRate });
        setMiners(Array.from(knownMiners.current.values()));
      }
    });

    // Écouter les alertes
    socket.on('new-alert', (alert: any) => {
      addAlert(alert);
    });

    socket.on('alert-popup', (alert: any) => {
      addAlert(alert);
    });

    socket.on('alert-resolved', (data: any) => {
      resolveAlert(data.alertId);
    });

    // Démarrer la simulation mock en attendant le backend
    if (!backendConnected.current) {
      mockIntervalRef.current = setInterval(() => {
        if (!backendConnected.current && isRealtime) {
          updateMiners();
        }
      }, 3000);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
