interface HeartRateData {
  value: number;
  timestamp: number;
  confidence: number;
}

interface GPSData {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
}

interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface GyroscopeData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface MagnetometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface EnvironmentData {
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp: number;
}

class TWatchSensorsService {
  private isMonitoring: boolean = false;
  private heartRateInterval: NodeJS.Timeout | null = null;
  private gpsInterval: NodeJS.Timeout | null = null;
  private sensorsInterval: NodeJS.Timeout | null = null;

  private heartRateHistory: HeartRateData[] = [];
  private gpsHistory: GPSData[] = [];
  private accelerometerHistory: AccelerometerData[] = [];

  private listeners: Map<string, (data: any) => void> = new Map();

  // Initialiser le service avec l'ID de l'appareil
  initialize(deviceId: string): void {
    console.log(`T-Watch Sensors initialized for device ${deviceId}`);
  }

  // Démarrer la surveillance de tous les capteurs
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startHeartRateMonitoring();
    this.startGPSMonitoring();
    this.startSensorsMonitoring();

    console.log('T-Watch Sensors monitoring started');
  }

  // Arrêter la surveillance
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.heartRateInterval) {
      clearInterval(this.heartRateInterval);
      this.heartRateInterval = null;
    }

    if (this.gpsInterval) {
      clearInterval(this.gpsInterval);
      this.gpsInterval = null;
    }

    if (this.sensorsInterval) {
      clearInterval(this.sensorsInterval);
      this.sensorsInterval = null;
    }

    console.log('T-Watch Sensors monitoring stopped');
  }

  // Surveillance de la fréquence cardiaque
  private startHeartRateMonitoring(): void {
    this.heartRateInterval = setInterval(() => {
      const heartRate = this.generateHeartRateData();
      this.heartRateHistory.push(heartRate);

      // Garder seulement les 100 dernières valeurs
      if (this.heartRateHistory.length > 100) {
        this.heartRateHistory.shift();
      }

      this.notifyListeners('heartRate', heartRate);
    }, 1000); // Toutes les secondes
  }

  // Générer des données de fréquence cardiaque simulées
  private generateHeartRateData(): HeartRateData {
    return {
      value: 0,
      timestamp: Date.now(),
      confidence: 0,
    };
  }

  // Surveillance GPS
  private startGPSMonitoring(): void {
    this.gpsInterval = setInterval(() => {
      const gps = this.generateGPSData();
      this.gpsHistory.push(gps);

      if (this.gpsHistory.length > 50) {
        this.gpsHistory.shift();
      }

      this.notifyListeners('gps', gps);
    }, 5000); // Toutes les 5 secondes
  }

  // Générer des données GPS simulées
  private generateGPSData(): GPSData {
    const lastGPS = this.gpsHistory[this.gpsHistory.length - 1];

    if (lastGPS) {
      return {
        latitude: lastGPS.latitude,
        longitude: lastGPS.longitude,
        altitude: lastGPS.altitude,
        accuracy: lastGPS.accuracy,
        speed: 0,
        heading: 0,
        timestamp: Date.now(),
      };
    }

    return {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      accuracy: 0,
      speed: 0,
      heading: 0,
      timestamp: Date.now(),
    };
  }

  // Surveillance des capteurs (accéléromètre, gyroscope, magnétomètre)
  private startSensorsMonitoring(): void {
    this.sensorsInterval = setInterval(() => {
      const accelerometer = this.generateAccelerometerData();
      const gyroscope = this.generateGyroscopeData();
      const magnetometer = this.generateMagnetometerData();

      this.accelerometerHistory.push(accelerometer);

      if (this.accelerometerHistory.length > 200) {
        this.accelerometerHistory.shift();
      }

      this.notifyListeners('accelerometer', accelerometer);
      this.notifyListeners('gyroscope', gyroscope);
      this.notifyListeners('magnetometer', magnetometer);
    }, 100); // 10 fois par seconde
  }

  // Générer des données d'accéléromètre simulées
  private generateAccelerometerData(): AccelerometerData {
    return {
      x: 0,
      y: 0,
      z: 0,
      timestamp: Date.now(),
    };
  }

  // Générer des données de gyroscope simulées
  private generateGyroscopeData(): GyroscopeData {
    return {
      x: 0,
      y: 0,
      z: 0,
      timestamp: Date.now(),
    };
  }

  // Générer des données de magnétomètre simulées
  private generateMagnetometerData(): MagnetometerData {
    return {
      x: 0,
      y: 0,
      z: 0,
      timestamp: Date.now(),
    };
  }

  // Obtenir les données de fréquence cardiaque actuelles
  getCurrentHeartRate(): HeartRateData | null {
    return this.heartRateHistory[this.heartRateHistory.length - 1] || null;
  }

  // Obtenir l'historique de la fréquence cardiaque
  getHeartRateHistory(limit?: number): HeartRateData[] {
    if (limit) {
      return this.heartRateHistory.slice(-limit);
    }
    return [...this.heartRateHistory];
  }

  // Calculer la fréquence cardiaque moyenne
  getAverageHeartRate(samples: number = 10): number {
    const recent = this.heartRateHistory.slice(-samples);
    if (recent.length === 0) return 0;

    const sum = recent.reduce((acc, data) => acc + data.value, 0);
    return Math.round(sum / recent.length);
  }

  // Détecter une anomalie de fréquence cardiaque
  detectHeartRateAnomaly(): boolean {
    const current = this.getCurrentHeartRate();
    if (!current) return false;

    const average = this.getAverageHeartRate(10);
    const difference = Math.abs(current.value - average);

    // Anomalie si la différence est supérieure à 20 bpm
    return difference > 20;
  }

  // Obtenir les données GPS actuelles
  getCurrentGPS(): GPSData | null {
    return this.gpsHistory[this.gpsHistory.length - 1] || null;
  }

  // Obtenir l'historique GPS
  getGPSHistory(limit?: number): GPSData[] {
    if (limit) {
      return this.gpsHistory.slice(-limit);
    }
    return [...this.gpsHistory];
  }

  // Calculer la distance parcourue
  calculateDistance(): number {
    if (this.gpsHistory.length < 2) return 0;

    let distance = 0;
    for (let i = 1; i < this.gpsHistory.length; i++) {
      const prev = this.gpsHistory[i - 1];
      const curr = this.gpsHistory[i];

      // Formule simplifiée de distance (Haversine)
      const R = 6371; // Rayon de la Terre en km
      const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
      const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.latitude * Math.PI) / 180) *
          Math.cos((curr.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += R * c;
    }

    return Math.round(distance * 1000); // En mètres
  }

  // Obtenir les données d'accéléromètre actuelles
  getCurrentAccelerometer(): AccelerometerData | null {
    return this.accelerometerHistory[this.accelerometerHistory.length - 1] || null;
  }

  // Détecter une chute (basé sur l'accéléromètre)
  detectFall(): boolean {
    const recent = this.accelerometerHistory.slice(-10);
    if (recent.length < 10) return false;

    // Vérifier s'il y a une accélération soudaine élevée
    for (const data of recent) {
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      if (magnitude > 20) {
        // Seuil de chute
        return true;
      }
    }

    return false;
  }

  // Détecter l'immobilité
  detectImmobility(): boolean {
    const recent = this.accelerometerHistory.slice(-30);
    if (recent.length < 30) return false;

    // Calculer la variance
    const avgX = recent.reduce((acc, d) => acc + d.x, 0) / recent.length;
    const avgY = recent.reduce((acc, d) => acc + d.y, 0) / recent.length;
    const avgZ = recent.reduce((acc, d) => acc + d.z, 0) / recent.length;

    const varianceX = recent.reduce((acc, d) => acc + Math.pow(d.x - avgX, 2), 0) / recent.length;
    const varianceY = recent.reduce((acc, d) => acc + Math.pow(d.y - avgY, 2), 0) / recent.length;
    const varianceZ = recent.reduce((acc, d) => acc + Math.pow(d.z - avgZ, 2), 0) / recent.length;

    const totalVariance = varianceX + varianceY + varianceZ;

    // Immobilité si la variance est très faible
    return totalVariance < 0.5;
  }

  // Obtenir les données environnementales
  getEnvironmentData(): EnvironmentData {
    return {
      temperature: 0,
      humidity: 0,
      pressure: 0,
      timestamp: Date.now(),
    };
  }

  // S'abonner aux mises à jour d'un capteur
  subscribe(sensorType: string, callback: (data: any) => void): void {
    this.listeners.set(sensorType, callback);
  }

  // Se désabonner
  unsubscribe(sensorType: string): void {
    this.listeners.delete(sensorType);
  }

  // Notifier les abonnés
  private notifyListeners(sensorType: string, data: any): void {
    const callback = this.listeners.get(sensorType);
    if (callback) {
      callback(data);
    }
  }

  // Vérifier si la surveillance est active
  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  // Obtenir le statut de tous les capteurs
  getSensorsStatus(): {
    heartRate: boolean;
    gps: boolean;
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  } {
    return {
      heartRate: this.heartRateInterval !== null,
      gps: this.gpsInterval !== null,
      accelerometer: this.sensorsInterval !== null,
      gyroscope: this.sensorsInterval !== null,
      magnetometer: this.sensorsInterval !== null,
    };
  }

  // Nettoyer les données
  clearHistory(): void {
    this.heartRateHistory = [];
    this.gpsHistory = [];
    this.accelerometerHistory = [];
  }
}

export const twatchSensorsService = new TWatchSensorsService();
export default twatchSensorsService;
