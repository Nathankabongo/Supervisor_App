import { useEffect, useRef } from 'react';
import { useStore, Alert } from '../store/useStore';
import apiService from '../services/api';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/urls';

export function useRealtimeConnection() {
  const setMiners = useStore((state) => state.setMiners);
  const setAlerts = useStore((state) => state.setAlerts);
  const updateMiner = useStore((state) => state.updateMiner);
  const addAlert = useStore((state) => state.addAlert);
  const resolveAlert = useStore((state) => state.resolveAlert);
  
  const socketRef = useRef<Socket | null>(null);
  const knownMiners = useRef(new Map<string, any>());

  useEffect(() => {
    // 1. Charger les données initiales réelles de la base
    const fetchInitialData = async () => {
      try {
        const [minersRes, alertsRes] = await Promise.all([
          apiService.getMiners(),
          apiService.getAlerts(),
        ]);

        if (minersRes.miners) {
          const mappedMiners = minersRes.miners.map((m: any) => {
            const hasGpsLogs = Array.isArray(m.trajectory) && m.trajectory.length > 0;
            const hasRealPos =
              (m.position && m.position.x != null && m.position.y != null) ||
              (m.x != null && m.y != null);
            const position = m.position
              ? m.position
              : hasRealPos
                ? { x: m.x, y: m.y, timestamp: Date.now() }
                : { x: 0, y: 0, timestamp: 0 };

            return {
              ...m,
              currentZone: m.zone || m.currentZone || '',
              currentGallery: m.gallery || m.currentGallery || '',
              position,
              // Trajectoire = logs GPS montre uniquement — pas de point inventé
              trajectory: hasGpsLogs ? m.trajectory : [],
              activityLevel: m.activityLevel ?? 0,
              status: m.status || 'safe',
              heartRate: m.heartRate ?? m.heart_rate ?? 0,
              isInService: m.is_in_service === 1 || m.isInService || false,
            };
          });

          setMiners(mappedMiners);
          
          knownMiners.current.clear();
          mappedMiners.forEach((m: any) => {
            knownMiners.current.set(m.id, m);
          });
        }

        if (alertsRes.alerts) {
          setAlerts(alertsRes.alerts);
        }
      } catch (err) {
        console.error('Erreur de chargement des données initiales:', err);
      }
    };

    fetchInitialData();

    // 2. Se connecter au WebSocket backend
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connecté au backend en temps réel');
      socket.emit('subscribe-alerts');
    });

    socket.on('disconnect', () => {
      console.log('Déconnecté du backend');
    });

    // Données de localisation de la montre
    socket.on('location-update', (data: any) => {
      const currentMiners = useStore.getState().miners;
      const existing = currentMiners.find((m) => m.id === data.minerId);
      if (data.x == null && data.y == null && !data.position) return;

      const position = data.position || { x: data.x, y: data.y, timestamp: Date.now() };

      const minerData = {
        id: data.minerId,
        name: data.name || existing?.name || data.minerId,
        matricule: existing?.matricule || data.minerId,
        role: existing?.role || 'Mineur',
        status: existing?.status || 'safe',
        currentZone: data.zone || existing?.currentZone || '',
        currentGallery: existing?.currentGallery || '',
        position: position,
        trajectory: existing
          ? [...(existing.trajectory || []).slice(-99), position]
          : [position],
        heartRate:
          data.heartRate !== undefined
            ? data.heartRate
            : existing?.heartRate !== undefined
              ? existing.heartRate
              : 0,
        activityLevel: data.activityLevel ?? existing?.activityLevel ?? 0,
        battery: data.battery !== undefined ? data.battery : existing?.battery,
        isInService: data.is_in_service !== undefined ? data.is_in_service : existing?.isInService,
        isUnderground:
          data.is_underground !== undefined ? data.is_underground : existing?.isUnderground,
        temperature: data.temperature !== undefined ? data.temperature : existing?.temperature,
        steps: data.steps !== undefined ? data.steps : existing?.steps,
        motion: data.motion !== undefined ? data.motion : existing?.motion,
      };

      if (!existing) {
        setMiners([...currentMiners, minerData]);
      } else {
        updateMiner(data.minerId, minerData);
      }
    });

    // Données de statut et biométrie
    socket.on('miner-status-update', (data: any) => {
      const currentMiners = useStore.getState().miners;
      const existing = currentMiners.find((m) => m.id === data.minerId);
      if (existing) {
        updateMiner(data.minerId, {
          status: data.status,
          heartRate: data.heartRate || existing.heartRate,
        });
      }
    });

    // Nouvelles alertes : un seul handler pour toast + store.
    // Le backend émet aussi 'alert-popup' (broadcast global) — on l'ignore ici
    // pour éviter le double toast / double entrée (new-alert arrive déjà via room 'alerts').
    socket.on('new-alert', (alert: any) => {
      addAlert(alert as Alert);
      useStore.getState().setLiveToastAlert(alert as Alert);
    });

    socket.on('alert-resolved', (data: any) => {
      resolveAlert(data.alertId);
    });

    socket.on('alert-deleted', (data: any) => {
      useStore.getState().deleteAlert(data.alertId);
    });

    socket.on('alerts-cleared', () => {
      useStore.getState().clearAlerts();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [setMiners, setAlerts, updateMiner, addAlert, resolveAlert]);
}
