/**
 * Application Mobile Smart Secure - Tracking Anti-Enlèvement
 * Version React Native pour iOS et Android
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  AppState,
  DeviceEventEmitter
} from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  useFocusEffect
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BackgroundJob from 'react-native-background-job';
import SmsAndroid from 'react-native-sms-android';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';

const Stack = createStackNavigator();

// Configuration des API
const GSM_API_URL = 'http://localhost:3001/api/tracking';
const TRANSPORT_API_URL = 'http://localhost:3002/api';

// Clés de sécurité
const EMERGENCY_KEYWORDS = ['URGENCE', 'SOS', 'HELP', 'DANGER'];
const PHANTOM_ACTIVATION_CODE = 'SMART_SECURE_2026';

class SmartSecureApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTracking: false,
      emergencyMode: false,
      phantomMode: false,
      currentPosition: null,
      signalStrength: null,
      connectedTowers: [],
      batteryLevel: null,
      lastUpdate: null
    };
    
    this.trackingInterval = null;
    this.emergencyTimeout = null;
    this.smsListener = null;
  }

  componentDidMount() {
    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Demander les permissions nécessaires
      await this.requestPermissions();
      
      // Configurer les notifications push
      this.setupNotifications();
      
      // Configurer le job en arrière-plan
      this.setupBackgroundJob();
      
      // Démarrer l'écoute SMS
      this.startSMSListener();
      
      // Vérifier l'état initial
      await this.checkInitialState();
      
      console.log('🛡️ Smart Secure App initialisée');
    } catch (error) {
      console.error('Erreur initialisation:', error);
    }
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      // Permissions Android
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        PermissionsAndroid.PERMISSIONS.PHONE_CALLS
      ];

      for (const permission of permissions) {
        const granted = await PermissionsAndroid.request(permission);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn(`Permission refusée: ${permission}`);
        }
      }
    }
  }

  setupNotifications() {
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('Notification reçue:', notification);
      },
      requestPermissions: Platform.OS === 'ios'
    });

    PushNotification.createChannel(
      {
        channelId: 'emergency-channel',
        channelName: 'Alertes d\'Urgence',
        channelDescription: 'Alertes critiques du système Smart Secure',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true
      }
    );
  }

  setupBackgroundJob() {
    BackgroundJob.on('background', async () => {
      console.log('📡 Tâche d\'arrière-plan exécutée');
      await this.sendPositionUpdate();
    });

    BackgroundJob.schedule({
      jobKey: 'smartSecureTracking',
      period: 30000, // 30 secondes
      exact: true,
      allowExecutionInForeground: true,
      requiredNetworkType: BackgroundJob.NETWORK_TYPE_ANY
    });
  }

  startSMSListener() {
    if (Platform.OS === 'android') {
      SmsAndroid.addListener(async (message) => {
        await this.processIncomingSMS(message);
      });
    }
  }

  async processIncomingSMS(message) {
    const { body, address } = message;
    const messageText = body.toUpperCase();
    
    console.log('📨 SMS reçu:', body);

    // Vérifier les mots-clés d'urgence
    const isEmergency = EMERGENCY_KEYWORDS.some(keyword => 
      messageText.includes(keyword)
    );

    if (isEmergency) {
      await this.activateEmergencyMode('SMS_TRIGGER');
    }

    // Vérifier le code d'activation mode fantôme
    if (messageText.includes(PHANTOM_ACTIVATION_CODE)) {
      await this.activatePhantomMode();
    }
  }

  async checkInitialState() {
    try {
      const emergencyMode = await AsyncStorage.getItem('emergencyMode');
      const phantomMode = await AsyncStorage.getItem('phantomMode');
      
      if (emergencyMode === 'true') {
        await this.activateEmergencyMode('RECOVERY');
      }
      
      if (phantomMode === 'true') {
        this.setState({ phantomMode: true });
      }
    } catch (error) {
      console.error('Erreur vérification état initial:', error);
    }
  }

  async activateEmergencyMode(trigger = 'MANUAL') {
    console.log(`🚨 MODE URGENCE ACTIVÉ (Trigger: ${trigger})`);
    
    this.setState({ 
      emergencyMode: true,
      isTracking: true 
    });

    await AsyncStorage.setItem('emergencyMode', 'true');

    // Envoyer une notification push
    PushNotification.localNotification({
      channelId: 'emergency-channel',
      title: '🚨 MODE URGENCE ACTIVÉ',
      message: 'Tracking anti-enlèvement activé',
      playSound: true,
      soundName: 'emergency_sound',
      actions: ['Désactiver', 'Appeler Secours']
    });

    // Démarrer le tracking intensif
    this.startIntensiveTracking();

    // Envoyer les SMS d'urgence
    await this.sendEmergencySMS();

    // Notifier le serveur
    await this.notifyEmergencyActivation(trigger);
  }

  async activatePhantomMode() {
    console.log('👻 MODE FANTÔME ACTIVÉ');
    
    this.setState({ phantomMode: true });
    await AsyncStorage.setItem('phantomMode', 'true');

    // Activer le tracking silencieux
    if (!this.state.isTracking) {
      this.startTracking();
    }

    // Notifier le serveur
    try {
      const response = await fetch(`${GSM_API_URL}/phantom-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: await this.getDeviceId(),
          activationCode: PHANTOM_ACTIVATION_CODE
        })
      });

      const result = await response.json();
      console.log('Mode fantôme confirmé par le serveur:', result);
    } catch (error) {
      console.error('Erreur activation mode fantôme:', error);
    }
  }

  async startIntensiveTracking() {
    // Position toutes les 10 secondes en mode urgence
    this.trackingInterval = setInterval(async () => {
      await this.sendPositionUpdate();
    }, 10000);
  }

  async startTracking() {
    if (this.state.isTracking) return;

    this.setState({ isTracking: true });

    // Position toutes les 30 secondes en mode normal
    this.trackingInterval = setInterval(async () => {
      await this.sendPositionUpdate();
    }, 30000);

    // Envoyer la première position immédiatement
    await this.sendPositionUpdate();
  }

  async stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.setState({ isTracking: false });
  }

  async sendPositionUpdate() {
    try {
      // Obtenir la position GPS
      const position = await this.getCurrentPosition();
      
      // Obtenir les informations réseau
      const networkInfo = await this.getNetworkInfo();
      
      // Obtenir les informations de batterie
      const batteryInfo = await this.getBatteryInfo();

      // Simuler les données de triangulation GSM
      const gsmData = await this.getGSMTriangulationData();

      const payload = {
        deviceId: await this.getDeviceId(),
        timestamp: new Date().toISOString(),
        gps: position,
        gsm: gsmData,
        network: networkInfo,
        battery: batteryInfo,
        emergencyMode: this.state.emergencyMode,
        phantomMode: this.state.phantomMode
      };

      // Envoyer au serveur GSM
      const response = await fetch(`${GSM_API_URL}/signal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: payload.deviceId,
          signals: gsmData.signals,
          emergencyMode: payload.emergencyMode
        })
      });

      const result = await response.json();
      
      // Mettre à jour l'état local
      this.setState({
        currentPosition: position,
        signalStrength: gsmData.signalStrength,
        connectedTowers: gsmData.towers,
        batteryLevel: batteryInfo.level,
        lastUpdate: new Date()
      });

      console.log('📍 Position envoyée:', result);

    } catch (error) {
      console.error('Erreur envoi position:', error);
    }
  }

  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp
          });
        },
        (error) => {
          console.warn('GPS non disponible, utilisation position par défaut');
          resolve({
            latitude: -4.325,
            longitude: 15.322,
            accuracy: 50,
            timestamp: Date.now()
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
    });
  }

  async getNetworkInfo() {
    try {
      const netInfo = await NetInfo.fetch();
      return {
        isConnected: netInfo.isConnected,
        type: netInfo.type,
        strength: netInfo.details?.strength || 0,
        frequency: netInfo.details?.frequency || 0
      };
    } catch (error) {
      return {
        isConnected: false,
        type: 'none',
        strength: 0,
        frequency: 0
      };
    }
  }

  async getBatteryInfo() {
    // Simulation - nécessiterait react-native-device-info
    return {
      level: Math.floor(Math.random() * 100),
      isCharging: Math.random() > 0.5
    };
  }

  async getGSMTriangulationData() {
    // Simuler les données des antennes relais
    const towers = [
      { towerId: 'tower_001', signalStrength: -82 + Math.random() * 10 },
      { towerId: 'tower_002', signalStrength: -85 + Math.random() * 10 },
      { towerId: 'tower_003', signalStrength: -88 + Math.random() * 10 }
    ];

    return {
      signals: towers,
      signalStrength: Math.max(...towers.map(t => t.signalStrength)),
      towers: towers.length
    };
  }

  async getDeviceId() {
    try {
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) return deviceId;
      
      // Générer un ID unique
      const newDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem('deviceId', newDeviceId);
      return newDeviceId;
    } catch (error) {
      return 'unknown_device';
    }
  }

  async sendEmergencySMS() {
    const emergencyContacts = await this.getEmergencyContacts();
    const message = `🚨 URGENCE - Je suis en danger! Position: ${this.state.currentPosition?.latitude}, ${this.state.currentPosition?.longitude} - Smart Secure Tracking Activé`;

    emergencyContacts.forEach(async (contact) => {
      try {
        if (Platform.OS === 'android') {
          SmsAndroid.sms(
            contact.phone,
            message,
            'sendDirect',
            (err, message) => {
              if (err) {
                console.error('Erreur SMS:', err);
              } else {
                console.log('SMS d\'urgence envoyé à:', contact.name);
              }
            }
          );
        }
      } catch (error) {
        console.error('Erreur envoi SMS à', contact.name, error);
      }
    });
  }

  async getEmergencyContacts() {
    try {
      const contacts = await AsyncStorage.getItem('emergencyContacts');
      return contacts ? JSON.parse(contacts) : [
        { name: 'Secours', phone: '112' },
        { name: 'Police', phone: '117' }
      ];
    } catch (error) {
      return [];
    }
  }

  async notifyEmergencyActivation(trigger) {
    try {
      const deviceId = await this.getDeviceId();
      
      await fetch(`${GSM_API_URL}/emergency-activation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId,
          trigger,
          timestamp: new Date().toISOString(),
          position: this.state.currentPosition
        })
      });
    } catch (error) {
      console.error('Erreur notification urgence:', error);
    }
  }

  async deactivateEmergencyMode() {
    console.log('✅ Mode urgence désactivé');
    
    this.setState({ emergencyMode: false });
    await AsyncStorage.setItem('emergencyMode', 'false');

    // Arrêter le tracking intensif
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    // Notification de désactivation
    PushNotification.localNotification({
      channelId: 'emergency-channel',
      title: '✅ Mode Urgence Désactivé',
      message: 'Vous êtes en sécurité maintenant',
      playSound: false
    });
  }

  render() {
    return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Smart Secure' }}
          />
          <Stack.Screen 
            name="Tracking" 
            component={TrackingScreen} 
            options={{ title: 'Tracking' }}
          />
          <Stack.Screen 
            name="Emergency" 
            component={EmergencyScreen} 
            options={{ title: 'Urgence' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
}

// Écran d'accueil
const HomeScreen = ({ navigation }) => {
  const [appState, setAppState] = useState({
    isTracking: false,
    emergencyMode: false,
    batteryLevel: 85
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="security" size={60} color="#3b82f6" />
        <Text style={styles.title}>Smart Secure</Text>
        <Text style={styles.subtitle}>Protection Intelligente</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>État du Système</Text>
        <View style={styles.statusRow}>
          <Icon 
            name={appState.isTracking ? "location-on" : "location-off"} 
            size={24} 
            color={appState.isTracking ? "#22c55e" : "#ef4444"} 
          />
          <Text>Tracking: {appState.isTracking ? 'Actif' : 'Inactif'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Icon name="battery-full" size={24} color="#3b82f6" />
          <Text>Batterie: {appState.batteryLevel}%</Text>
        </View>
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('Tracking')}
        >
          <Icon name="gps-fixed" size={30} color="white" />
          <Text style={styles.buttonText}>Tracking</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.emergencyButton]}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Icon name="warning" size={30} color="white" />
          <Text style={styles.buttonText}>Urgence</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => {/* Navigation vers settings */}}
        >
          <Icon name="settings" size={30} color="white" />
          <Text style={styles.buttonText}>Paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => {/* Navigation vers contacts */}}
        >
          <Icon name="contacts" size={30} color="white" />
          <Text style={styles.buttonText}>Contacts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 5
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  button: {
    width: '48%',
    height: 120,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15
  },
  primaryButton: {
    backgroundColor: '#3b82f6'
  },
  emergencyButton: {
    backgroundColor: '#ef4444'
  },
  secondaryButton: {
    backgroundColor: '#64748b'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8
  }
});

export default SmartSecureApp;
