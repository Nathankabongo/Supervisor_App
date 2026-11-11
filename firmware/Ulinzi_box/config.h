#pragma once

// ============================================================
// CONFIGURATION DE CETTE ULINZI BOX
// Pour déployer plusieurs box sur le site, modifiez simplement
// BOX_ID, BOX_NAME, BOX_ZONE et BOX_GALLERY avant de flasher.
// ============================================================

#define BOX_ID          "ULINZI-BOX-01"      // Identifiant unique (ex: ULINZI-BOX-01, ULINZI-BOX-02...)
#define BOX_NAME        "Ulinzi Box Zone B"  // Nom affiché dans Supervisor App
#define BOX_ZONE        "ZONE B"             // Zone minière affectée
#define BOX_GALLERY     "Galerie 3 Nord"     // Galerie / emplacement précis

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

