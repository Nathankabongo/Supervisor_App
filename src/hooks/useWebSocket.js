import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useWebSocket() {
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    // Connect to WebSocket server
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      listenersRef.current.set(event, callback);
    }
  };

  const off = (event) => {
    if (socketRef.current) {
      socketRef.current.off(event);
      listenersRef.current.delete(event);
    }
  };

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const subscribeToMiner = (minerId) => {
    emit('subscribe-miner', minerId);
  };

  const unsubscribeFromMiner = (minerId) => {
    emit('unsubscribe-miner', minerId);
  };

  const subscribeToAlerts = () => {
    emit('subscribe-alerts');
  };

  const unsubscribeFromAlerts = () => {
    emit('unsubscribe-alerts');
  };

  return {
    socket: socketRef.current,
    on,
    off,
    emit,
    subscribeToMiner,
    unsubscribeFromMiner,
    subscribeToAlerts,
    unsubscribeFromAlerts,
    connected: socketRef.current?.connected || false
  };
}
