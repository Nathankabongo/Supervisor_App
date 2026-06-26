# Mine Security Watch – Documentation d'Installation
## Firmware v1.0.0 | LilyGO T-Watch S3 Plus

---

## 📋 Prérequis

### Matériel
- LilyGO T-Watch S3 Plus
- Câble USB-C (données, pas seulement chargement)
- PC avec Arduino IDE 2.x

### Logiciels
- **Arduino IDE** 2.3+
- **ESP32 Board Package** 3.x (via Gestionnaire de cartes)
- **LilyGoLib** (bibliothèque officielle LilyGO)

---

## 🔧 Installation Arduino IDE

### 1. Ajout du Board Manager ESP32

Dans Arduino IDE → `Fichier` → `Préférences` → **URL supplémentaires** :
```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

Puis `Outils` → `Type de carte` → `Gestionnaire de cartes` → chercher **esp32** → Installer **3.x**.

### 2. Installation LilyGoLib

Option A – Via ZIP :
1. Télécharger depuis https://github.com/Xinyuan-LilyGO/LilyGoLib
2. Arduino IDE → `Croquis` → `Inclure une bibliothèque` → `Ajouter .ZIP`

Option B – Via git (recommandé) :
```bash
cd <dossier_libraries_arduino>
git clone https://github.com/Xinyuan-LilyGO/LilyGoLib.git
```

### 3. Configuration de la carte

`Outils` → Paramètres :

| Paramètre | Valeur |
|-----------|--------|
| Board | **LilyGO T-Watch S3 Plus** |
| CPU Frequency | 240MHz |
| Flash Mode | QIO 80MHz |
| Flash Size | **16MB** |
| Partition Scheme | **Huge APP (3MB No OTA)** |
| USB CDC On Boot | **Enabled** ✅ |
| Upload Speed | 921600 |
| Port | COM8 (votre port) |

---

## 📁 Structure du Projet

```
MineSecurityWatch/
├── MineSecurityWatch.ino    ← Fichier principal
├── config.h                 ← ⚠️ À CONFIGURER avant déploiement
├── data_model.h             ← Structures de données
│
├── ui_home.h / .cpp         ← Écran Dashboard
├── ui_health.h / .cpp       ← Écran Santé
├── ui_network.h / .cpp      ← Écran Réseau
├── ui_alert.h / .cpp        ← Écran Alertes + Urgence SOS
│
├── sensor_service.h / .cpp  ← Capteurs IMU + détection chute
├── battery_service.h / .cpp ← Gestion batterie
├── wifi_service.h / .cpp    ← WiFi + reconnexion auto
├── api_service.h / .cpp     ← REST API HTTP
└── lora_service.h / .cpp    ← Radio LoRa SX1262
```

---

## ⚙️ Configuration avant déploiement

Éditer **`config.h`** :

```cpp
// Identité du mineur
#define CFG_WORKER_ID     "M001"        // ← ID unique de la montre
#define CFG_WORKER_NAME   "Jean Mbeki"  // ← Nom du mineur
#define CFG_WORKER_ZONE   "Zone B"      // ← Zone de travail

// WiFi
#define CFG_WIFI_SSID     "MineSite_WiFi"
#define CFG_WIFI_PASSWORD "VotreMotDePasse"

// Serveur API
#define CFG_API_HOST      "192.168.1.100"  // ← IP de votre serveur
#define CFG_API_PORT      3000

// LoRa (adapter à votre région)
#define CFG_LORA_FREQ     868.0  // MHz (868 Europe / 915 Amérique)
```

---

## 📡 API REST – Format des données

### Envoi périodique (toutes les 30s)
```
POST http://<serveur>:3000/api/watch/data
Content-Type: application/json

{
  "workerId": "M001",
  "battery": 90.0,
  "temperature": 36.4,
  "steps": 1542,
  "motion": "walking",
  "lat": -4.325000,
  "lng": 15.312000,
  "timestamp": "2026-01-01T10:00:00Z"
}
```

### Alerte SOS / Chute
```
POST http://<serveur>:3000/api/watch/sos
Content-Type: application/json

{
  "workerId": "M001",
  "type": "SOS",           ← ou "FALL"
  "battery": 75.0,
  "lat": -4.325000,
  "lng": 15.312000,
  "timestamp": "2026-01-01T10:00:00Z"
}
```

---

## 📻 LoRa – Protocole de messages

### Format trame interne
```
[DST:1 octet][SRC:1 octet][TYPE:1 octet][LEN:1 octet][PAYLOAD:N][CHECKSUM:1]
```

### Types
- `0x01` = Données
- `0x02` = SOS
- `0x03` = Chute (FALL)
- `0x04` = ACK
- `0x05` = Texte libre

### Messages superviseur reconnus
- `EVACUEZ` → déclenche alerte type EVACUATE
- `RENDEZ-VOUS` → déclenche alerte type RALLY_POINT

---

## 🎮 Navigation Interface

| Geste | Action |
|-------|--------|
| Swipe ← | Écran suivant |
| Swipe → | Écran précédent |
| Appui long SOS (2s) | Déclenche SOS |
| Tap "Annuler" | Retour depuis écran urgence |

### Ordre des écrans
```
[Dashboard] ←→ [Santé] ←→ [Réseau] ←→ [Alertes]
```

---

## 🏃 Démarrage Rapide

1. Ouvrir `MineSecurityWatch/MineSecurityWatch.ino` dans Arduino IDE
2. Configurer `config.h` avec vos paramètres
3. Connecter la montre via USB-C
4. Sélectionner le bon port COM
5. Cliquer **Téléverser** (Ctrl+U)
6. Ouvrir le Moniteur Série (115200 baud) pour les logs
7. ✅ La montre affiche le Dashboard au démarrage

---

## 🔍 Débogage

### Logs Serial (115200 baud)
```
╔══════════════════════════════════════╗
║   MINE SECURITY WATCH  v1.0.0        ║
╚══════════════════════════════════════╝
[INIT] Initialisation LilyGoLib...  ✅
[WIFI] Connexion à MineSite_WiFi ... ✅ IP: 192.168.1.42
[LORA] SX1262 initialisé            ✅
[SENSOR] Service capteurs initialisé ✅
[UI] Tâche démarrée
[SENSOR] Tâche démarrée
```

### Erreurs fréquentes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `vfs_fat_spiflash: f_mount failed` | Filesystem non formaté | Normal – ignorez |
| WiFi non connecté | SSID/password incorrect | Vérifier config.h |
| Aucun écran | USB CDC On Boot désactivé | Activer dans Outils |
| LoRa silencieux | Fréquence incorrecte | Adapter CFG_LORA_FREQ |

---

## ⚡ Optimisation Énergie

Le firmware gère automatiquement :
- **Écran** : extinction après `CFG_DISPLAY_TIMEOUT` (30s)
- **Light Sleep** : après `CFG_SLEEP_TIMEOUT` (60s)
- **Reconnexion auto** : WiFi toutes les 5s si perdu
- **Heartbeat LoRa** : toutes les 60s

Pour allonger la durée de vie batterie en production :
```cpp
// Dans config.h
#define CFG_API_INTERVAL    60000    // Réduire à 1 envoi/minute
#define CFG_DISPLAY_TIMEOUT 15000   // Écran éteint après 15s
```

---

## 📋 Résumé Tâches FreeRTOS

| Tâche | Core | Priorité | Rôle |
|-------|------|----------|------|
| UITask | 1 | 3 | Rendu LVGL + navigation |
| SensorTask | 1 | 4 | Lecture IMU toutes les 1s |
| WiFiTask | 0 | 2 | Reconnexion auto |
| ApiTask | 0 | 2 | Envoi REST toutes les 30s |
| LoRaTask | 0 | 3 | RX/TX radio + heartbeat |
| AlertTask | 1 | 5 | Queue alertes (priorité max) |

---

*Mine Security Watch – Sécurité des mineurs, version terrain*
*Développé avec LilyGoLib + LVGL + FreeRTOS*
