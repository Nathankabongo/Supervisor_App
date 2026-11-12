#pragma once

// ============================================================
// CONFIGURATION PLUG & PLAY DE CETTE ULINZI BOX
// Laissez BOX_ID à "AUTO" : chaque ESP32 génère automatiquement
// un identifiant unique depuis sa puce (ex: ULINZI-A4F2C1).
// La zone et la galerie sont ensuite pilotées par Supervisor_App.
// ============================================================

#define BOX_ID          "AUTO"               // "AUTO" = ID unique depuis la puce ESP32 (ou ID fixe personnalisé)
#define BOX_NAME        "Ulinzi Box"         // Nom par défaut avant affectation dans Supervisor_App
#define BOX_ZONE        "NON_AFFECTEE"       // Zone par défaut (mise à jour automatiquement par Supervisor_App)
#define BOX_GALLERY     "En attente"         // Galerie par défaut (mise à jour automatiquement par Supervisor_App)

// ---------------- Wi-Fi Serveur (Supervisor App) ----------------
#define WIFI_STA_SSID   "Nathan Sky"
#define WIFI_STA_PASS   "11111111"

// ---------------- Point d'accès local (Tableau de bord embarqué) ----------------
#define ENABLE_LOCAL_AP true
#define AP_PASSWORD     "11111111"           // 8 caractères minimum

// ---------------- Backend Supervisor App ----------------
// IP LAN du PC hébergeant Supervisor_App (port 5000 par défaut)
#define API_BASE_URL    "http://172.20.10.3:5000"

// Clé partagée permettant l'auto-enregistrement de plusieurs Ulinzi Box
// (doit correspondre à ULINZI_PROVISION_KEY côté backend, défaut : ULINZI-SITE-2026)
#define PROVISION_KEY   "ULINZI-SITE-2026"

// Laisser vide "" pour récupérer et mémoriser automatiquement un token unique en Flash,
// ou coller ici un token généré manuellement depuis Supervisor App.
#define STATIC_DEVICE_TOKEN ""

// ---------------- Cadences & Timeouts réseau ----------------
#define TELEMETRY_INTERVAL_MS 2000UL   // Envoi capteurs toutes les 2 s
#define COMMAND_POLL_MS       500UL    // Vérification ordres sirène toutes les 500 ms
#define HTTP_TIMEOUT_MS       1500     // Timeout HTTP court (protège la réactivité)
#define WIFI_RETRY_MS         5000UL   // Délai entre tentatives de reconnexion Wi-Fi

// ---------------- Balise BLE (Localisation Souterraine IPS) ----------------
#define ENABLE_BLE_BEACON     true     // Diffuse BOX_ID en BLE pour les montres T-Watch
#define BLE_TX_POWER_1M       (-59)    // RSSI mesuré à 1 mètre (dBm) pour calibration IPS

