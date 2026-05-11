/**
 * FIRMWARE T-WATCH S3 PLUS - MONTRE MINEUR
 * 
 * Hardware: LilyGO T-Watch S3 Plus
 *   - ESP32-S3 (240MHz dual-core, WiFi/BLE)
 *   - LoRa SX1262 (868/915 MHz)
 *   - GPS (AT6558)
 *   - IMU (BMI270 - accéléromètre/gyroscope)
 *   - Cardyomètre (MAX30102)
 *   - Écran TFT 1.54"
 *   - Batterie 600mAh
 * 
 * Communication: LoRa → Passerelle USB → Backend → Frontend
 * Protocole: JSON terminé par \n
 */

#include <Arduino.h>
#include <RadioLib.h>
#include <Wire.h>
#include <SPI.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION ====================

// Identifiant du mineur (à configurer par mineur)
#define MINER_ID "MIN-001"
#define MINER_NAME "Jean Dupont"

// Fréquence LoRa (868 MHz pour Europe, 915 MHz pour US)
#define LORA_FREQUENCY 868.0
#define LORA_BANDWIDTH 125.0
#define LORA_SPREADING_FACTOR 7
#define LORA_CODING_RATE 5
#define LORA_OUTPUT_POWER 22
#define LORA_SYNC_WORD 0x12

// Intervalles d'envoi (en millisecondes)
#define LOCATION_INTERVAL 5000    // Localisation toutes les 5s
#define STATUS_INTERVAL   30000   // Statut toutes les 30s
#define HEALTH_INTERVAL   60000   // Santé toutes les 60s

// Seuils d'alerte
#define FALL_THRESHOLD 2.5        // Accélération g pour détection de chute
#define IMMOBILITY_TIMEOUT 300000 // 5 minutes sans mouvement = immobilité
#define HEART_RATE_LOW 40         // BPM bas = danger
#define HEART_RATE_HIGH 150       // BPM haut = danger

// ==================== BROCHES T-WATCH S3 ====================

// LoRa SX1262
#define LORA_SCK   41
#define LORA_MISO  38
#define LORA_MOSI  42
#define LORA_SS    40
#define LORA_RST   18
#define LORA_DIO1  45
#define LORA_BUSY  39

// IMU BMI270
#define IMU_SDA 17
#define IMU_SCL 18

// ==================== VARIABLES GLOBALES ====================

SPIClass loraSpi(VSPI);
SX1262 radio = new Module(LORA_SS, LORA_DIO1, LORA_RST, LORA_BUSY, loraSpi);

// Données capteurs
struct SensorData {
  float accelX, accelY, accelZ;   // Accélération (g)
  float gyroX, gyroY, gyroZ;     // Gyroscope (°/s)
  int heartRate;                   // BPM
  float temperature;               // Température (°C)
  float oxygenLevel;               // SpO2 (%)
  int steps;                       // Pas
  float batteryLevel;              // Batterie (%)
  float latitude, longitude;       // GPS
  bool gpsValid;                   // GPS fix
};

struct MinerState {
  char minerId[16];
  char name[32];
  char zone[16];
  float x, y;                      // Position sur carte (0-1000, 0-500)
  char status[8];                  // safe, warning, danger
  unsigned long lastMovementTime;
  unsigned long lastLocationSend;
  unsigned long lastStatusSend;
  unsigned long lastHealthSend;
};

SensorData sensors = {};
MinerState miner = {};

// ==================== INITIALISATION ====================

void setup() {
  Serial.begin(115200);
  Serial.println("T-Watch S3 Plus - Mineur Monitor");
  
  // Initialiser l'état du mineur
  strncpy(miner.minerId, MINER_ID, sizeof(miner.minerId));
  strncpy(miner.name, MINER_NAME, sizeof(miner.name));
  strcpy(miner.zone, "ZONE A");
  strcpy(miner.status, "safe");
  miner.x = 150;
  miner.y = 150;
  miner.lastMovementTime = millis();

  // Initialiser LoRa
  loraSpi.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  
  int state = radio.begin(LORA_FREQUENCY, LORA_BANDWIDTH, LORA_SPREADING_FACTOR, 
                          LORA_CODING_RATE, LORA_SYNC_WORD, LORA_OUTPUT_POWER, 
                          8, 1.6, 20);
  
  if (state == RADIOLIB_ERR_NONE) {
    Serial.println("LoRa SX1262 initialisé avec succès");
  } else {
    Serial.print("Erreur LoRa: ");
    Serial.println(state);
  }

  // Initialiser I2C pour capteurs
  Wire.begin(IMU_SDA, IMU_SCL);
  
  // TODO: Initialiser BMI270, MAX30102, GPS
  // initIMU();
  // initHeartRate();
  // initGPS();
  
  Serial.println("Initialisation terminée");
}

// ==================== BOUCLE PRINCIPALE ====================

void loop() {
  unsigned long now = millis();
  
  // 1. Lire les capteurs
  readSensors();
  
  // 2. Détecter les alertes
  detectAlerts();
  
  // 3. Envoyer localisation
  if (now - miner.lastLocationSend >= LOCATION_INTERVAL) {
    sendLocation();
    miner.lastLocationSend = now;
  }
  
  // 4. Envoyer statut
  if (now - miner.lastStatusSend >= STATUS_INTERVAL) {
    sendStatus();
    miner.lastStatusSend = now;
  }
  
  // 5. Envoyer santé
  if (now - miner.lastHealthSend >= HEALTH_INTERVAL) {
    sendHealth();
    miner.lastHealthSend = now;
  }
  
  // 6. Vérifier commandes entrantes
  receiveCommands();
  
  // 7. Mettre à jour position (simulation si pas de GPS)
  updatePosition();
  
  delay(100); // Boucle à ~10Hz
}

// ==================== LECTURE CAPTEURS ====================

void readSensors() {
  // TODO: Remplacer par vraies lectures capteurs
  
  // BMI270 - Accéléromètre/Gyroscope
  // sensors.accelX = imu.readAccelX();
  // sensors.accelY = imu.readAccelY();
  // sensors.accelZ = imu.readAccelZ();
  
  // MAX30102 - Cardyomètre
  // sensors.heartRate = heartRateSensor.getHeartRate();
  // sensors.oxygenLevel = heartRateSensor.getSpO2();
  
  // Batterie
  sensors.batteryLevel = readBatteryLevel();
  
  // GPS
  // if (gps.location.isValid()) {
  //   sensors.latitude = gps.location.lat();
  //   sensors.longitude = gps.location.lng();
  //   sensors.gpsValid = true;
  // }
  
  // Valeurs simulées pour test
  sensors.heartRate = 72 + random(-5, 5);
  sensors.temperature = 36.5 + (random(-10, 10) * 0.1);
  sensors.oxygenLevel = 97 + random(-2, 3);
  sensors.accelX = 0.0 + (random(-10, 10) * 0.01);
  sensors.accelY = 0.0 + (random(-10, 10) * 0.01);
  sensors.accelZ = 1.0 + (random(-10, 10) * 0.01);
  sensors.steps = 1500 + random(0, 10);
}

float readBatteryLevel() {
  // Lire la tension de batterie via ADC
  // T-Watch S3 utilise le circuit de charge IP5306
  uint16_t vbat = analogRead(4); // Pin de batterie
  return map(vbat, 0, 4095, 0, 100);
}

// ==================== DÉTECTION D'ALERTES ====================

void detectAlerts() {
  unsigned long now = millis();
  float accelMagnitude = sqrt(
    sensors.accelX * sensors.accelX + 
    sensors.accelY * sensors.accelY + 
    sensors.accelZ * sensors.accelZ
  );
  
  // Détection de chute: accélération > seuil
  if (accelMagnitude > FALL_THRESHOLD) {
    sendAlert("fall", "high", "Chute détectée");
    strcpy(miner.status, "danger");
  }
  
  // Détection immobilité: pas de mouvement depuis X minutes
  if (accelMagnitude > 0.1) {
    miner.lastMovementTime = now;
  }
  if (now - miner.lastMovementTime > IMMOBILITY_TIMEOUT) {
    sendAlert("immobility", "medium", "Immobilité prolongée");
    strcpy(miner.status, "warning");
  }
  
  // Fréquence cardiaque anormale
  if (sensors.heartRate < HEART_RATE_LOW || sensors.heartRate > HEART_RATE_HIGH) {
    sendAlert("emergency", "high", "Fréquence cardiaque anormale");
    strcpy(miner.status, "danger");
  }
  
  // Bouton SOS (à connecter au bouton physique)
  // if (digitalRead(SOS_BUTTON_PIN) == LOW) {
  //   sendAlert("emergency", "high", "Bouton SOS activé");
  //   strcpy(miner.status, "danger");
  // }
}

// ==================== ENVOI LORA ====================

void sendLocation() {
  JsonDocument doc;
  doc["type"] = "location";
  doc["minerId"] = miner.minerId;
  doc["name"] = miner.name;
  doc["x"] = round(miner.x * 10) / 10.0;
  doc["y"] = round(miner.y * 10) / 10.0;
  doc["zone"] = miner.zone;
  doc["battery"] = round(sensors.batteryLevel);
  doc["rssi"] = 0; // Sera rempli par la passerelle
  
  transmitJson(doc);
}

void sendStatus() {
  JsonDocument doc;
  doc["type"] = "status";
  doc["minerId"] = miner.minerId;
  doc["status"] = miner.status;
  doc["heartRate"] = sensors.heartRate;
  doc["temperature"] = round(sensors.temperature * 10) / 10.0;
  doc["steps"] = sensors.steps;
  doc["battery"] = round(sensors.batteryLevel);
  
  transmitJson(doc);
  
  // Remettre le statut à safe après envoi si c'était warning
  if (strcmp(miner.status, "warning") == 0) {
    strcpy(miner.status, "safe");
  }
}

void sendHealth() {
  JsonDocument doc;
  doc["type"] = "health";
  doc["minerId"] = miner.minerId;
  doc["heartRate"] = sensors.heartRate;
  doc["temperature"] = round(sensors.temperature * 10) / 10.0;
  doc["oxygenLevel"] = round(sensors.oxygenLevel);
  
  transmitJson(doc);
}

void sendAlert(const char* alertType, const char* severity, const char* message) {
  JsonDocument doc;
  doc["type"] = "alert";
  doc["minerId"] = miner.minerId;
  doc["minerName"] = miner.name;
  doc["alertType"] = alertType;
  doc["severity"] = severity;
  doc["message"] = message;
  doc["zone"] = miner.zone;
  
  transmitJson(doc);
}

void transmitJson(JsonDocument& doc) {
  String json;
  serializeJson(doc, json);
  
  // Envoyer via LoRa
  int state = radio.transmit(json.c_str());
  
  if (state == RADIOLIB_ERR_NONE) {
    Serial.print("TX: ");
    Serial.println(json);
  } else {
    Serial.print("Erreur TX LoRa: ");
    Serial.println(state);
  }
}

// ==================== RÉCEPTION COMMANDES ====================

void receiveCommands() {
  // Écouter les commandes du superviseur pendant 100ms
  String recvStr;
  int state = radio.receive(recvStr);
  
  if (state == RADIOLIB_ERR_NONE) {
    Serial.print("RX: ");
    Serial.println(recvStr);
    
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, recvStr);
    
    if (!err && doc.containsKey("type") && strcmp(doc["type"], "command") == 0) {
      const char* targetId = doc["targetId"];
      
      // Vérifier si la commande nous est destinée
      if (strcmp(targetId, miner.minerId) == 0) {
        const char* command = doc["command"];
        handleCommand(command, doc);
      }
    }
  }
}

void handleCommand(const char* command, JsonDocument& doc) {
  Serial.print("Commande reçue: ");
  Serial.println(command);
  
  if (strcmp(command, "evacuate") == 0) {
    // Évacuation: alerter le mineur (vibration + écran)
    // motor_vibrate(500);
    // display_evacuation_alert(doc["data"]["zone"]);
    sendAck(command, "ok");
  }
  else if (strcmp(command, "heartbeat_request") == 0) {
    // Envoyer immédiatement les données de santé
    sendHealth();
    sendAck(command, "ok");
  }
  else if (strcmp(command, "alert_cancel") == 0) {
    // Annuler une alerte
    strcpy(miner.status, "safe");
    sendAck(command, "ok");
  }
}

void sendAck(const char* command, const char* status) {
  JsonDocument doc;
  doc["type"] = "ack";
  doc["minerId"] = miner.minerId;
  doc["commandId"] = command;
  doc["status"] = status;
  
  transmitJson(doc);
}

// ==================== MISE À JOUR POSITION ====================

void updatePosition() {
  // Si GPS disponible, convertir en coordonnées carte
  // if (sensors.gpsValid) {
  //   miner.x = gpsToMapX(sensors.latitude);
  //   miner.y = gpsToMapY(sensors.longitude);
  // }
  
  // Simulation: léger mouvement aléatoire
  miner.x += (random(-10, 10) * 0.5);
  miner.y += (random(-10, 10) * 0.5);
  
  // Limiter aux bornes de la carte
  miner.x = constrain(miner.x, 0, 1000);
  miner.y = constrain(miner.y, 0, 500);
}

// ==================== CONVERSION GPS → CARTE ====================

// Ces fonctions convertissent les coordonnées GPS réelles
// en coordonnées (x,y) de la carte de la mine

float gpsToMapX(float lat) {
  // Adapter aux limites de la mine
  // Exemple: latitude 14.700 à 14.710 → x 0 à 1000
  float minLat = 14.700;
  float maxLat = 14.710;
  return mapFloat(lat, minLat, maxLat, 0, 1000);
}

float gpsToMapY(float lon) {
  // Adapter aux limites de la mine
  float minLon = -17.460;
  float maxLon = -17.450;
  return mapFloat(lon, minLon, maxLon, 0, 500);
}

float mapFloat(float x, float inMin, float inMax, float outMin, float outMax) {
  return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
