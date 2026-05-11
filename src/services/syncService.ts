import loraService from './loraService';

interface SyncData {
  deviceId: string;
  healthData?: {
    heartRate: number;
    bloodPressure?: { systolic: number; diastolic: number };
    oxygenSaturation?: number;
    temperature?: number;
    steps?: number;
    calories?: number;
  };
  locationData?: {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    timestamp: number;
  };
  activityData?: {
    type: 'walking' | 'running' | 'stationary' | 'mining';
    duration: number;
    intensity: number;
  };
  sensorData?: {
    accelerometer: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
    magnetometer: { x: number; y: number; z: number };
  };
}

interface SyncResult {
  success: boolean;
  syncedItems: string[];
  failedItems: string[];
  timestamp: number;
}

class SyncService {
  private lastSyncTime: Map<string, number> = new Map();
  private syncInterval: number = 30000; // 30 secondes
  private isSyncing: boolean = false;
  private autoSyncEnabled: boolean = true;
  private syncTimer: NodeJS.Timeout | null = null;

  // Démarrer la synchronisation automatique
  startAutoSync(deviceId: string): void {
    if (!this.autoSyncEnabled) return;

    this.stopAutoSync(deviceId);

    this.syncTimer = setInterval(() => {
      this.syncDevice(deviceId);
    }, this.syncInterval);

    console.log(`Auto-sync started for device ${deviceId}`);
  }

  // Arrêter la synchronisation automatique
  stopAutoSync(deviceId: string): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log(`Auto-sync stopped for device ${deviceId}`);
  }

  // Synchroniser un appareil
  async syncDevice(deviceId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedItems: [],
        failedItems: [],
        timestamp: Date.now(),
      };
    }

    this.isSyncing = true;

    try {
      const data = await this.collectData(deviceId);
      const result = await this.sendData(deviceId, data);
      
      this.lastSyncTime.set(deviceId, Date.now());
      this.isSyncing = false;

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      this.isSyncing = false;
      
      return {
        success: false,
        syncedItems: [],
        failedItems: ['all'],
        timestamp: Date.now(),
      };
    }
  }

  // Collecter les données de l'appareil
  private async collectData(deviceId: string): Promise<SyncData> {
    // Simulation de collecte de données
    return {
      deviceId,
      healthData: {
        heartRate: 70 + Math.floor(Math.random() * 40),
        bloodPressure: {
          systolic: 110 + Math.floor(Math.random() * 30),
          diastolic: 70 + Math.floor(Math.random() * 20),
        },
        oxygenSaturation: 95 + Math.floor(Math.random() * 5),
        temperature: 36 + Math.random() * 2,
        steps: Math.floor(Math.random() * 10000),
        calories: Math.floor(Math.random() * 500),
      },
      locationData: {
        latitude: -20 + Math.random() * 40,
        longitude: -20 + Math.random() * 40,
        altitude: Math.floor(Math.random() * 500),
        accuracy: 5 + Math.random() * 10,
        timestamp: Date.now(),
      },
      activityData: {
        type: ['walking', 'running', 'stationary', 'mining'][Math.floor(Math.random() * 4)] as any,
        duration: Math.floor(Math.random() * 3600),
        intensity: Math.floor(Math.random() * 10),
      },
      sensorData: {
        accelerometer: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
        },
        gyroscope: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
        },
        magnetometer: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
        },
      },
    };
  }

  // Envoyer les données via LoRa
  private async sendData(deviceId: string, data: SyncData): Promise<SyncResult> {
    const syncedItems: string[] = [];
    const failedItems: string[] = [];

    // Envoyer les données de santé
    if (data.healthData) {
      const success = await loraService.sendHealthData(deviceId, data.healthData);
      if (success) {
        syncedItems.push('healthData');
      } else {
        failedItems.push('healthData');
      }
    }

    // Envoyer les données de localisation
    if (data.locationData) {
      const success = await loraService.sendLocation(deviceId, {
        x: data.locationData.latitude,
        y: data.locationData.longitude,
        z: data.locationData.altitude,
      });
      if (success) {
        syncedItems.push('locationData');
      } else {
        failedItems.push('locationData');
      }
    }

    // Envoyer les données d'activité
    if (data.activityData) {
      const success = await loraService.syncData(deviceId, data.activityData);
      if (success) {
        syncedItems.push('activityData');
      } else {
        failedItems.push('activityData');
      }
    }

    // Envoyer les données de capteurs
    if (data.sensorData) {
      const success = await loraService.syncData(deviceId, data.sensorData);
      if (success) {
        syncedItems.push('sensorData');
      } else {
        failedItems.push('sensorData');
      }
    }

    return {
      success: failedItems.length === 0,
      syncedItems,
      failedItems,
      timestamp: Date.now(),
    };
  }

  // Synchroniser les données de santé uniquement
  async syncHealthData(deviceId: string, healthData: SyncData['healthData']): Promise<boolean> {
    if (!healthData) return false;
    return await loraService.sendHealthData(deviceId, healthData);
  }

  // Synchroniser les données de localisation uniquement
  async syncLocationData(deviceId: string, locationData: SyncData['locationData']): Promise<boolean> {
    if (!locationData) return false;
    return await loraService.sendLocation(deviceId, {
      x: locationData.latitude,
      y: locationData.longitude,
      z: locationData.altitude,
    });
  }

  // Obtenir le temps de la dernière synchronisation
  getLastSyncTime(deviceId: string): number | undefined {
    return this.lastSyncTime.get(deviceId);
  }

  // Définir l'intervalle de synchronisation
  setSyncInterval(interval: number): void {
    this.syncInterval = interval;
  }

  // Activer/désactiver la synchronisation automatique
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
  }

  // Vérifier si la synchronisation est en cours
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  // Synchroniser manuellement
  async manualSync(deviceId: string): Promise<SyncResult> {
    return await this.syncDevice(deviceId);
  }

  // Obtenir le statut de synchronisation
  getSyncStatus(deviceId: string): {
    lastSync: number | undefined;
    isSyncing: boolean;
    autoSyncEnabled: boolean;
  } {
    return {
      lastSync: this.lastSyncTime.get(deviceId),
      isSyncing: this.isSyncing,
      autoSyncEnabled: this.autoSyncEnabled,
    };
  }
}

export const syncService = new SyncService();
export default syncService;
