#pragma once

/* Relais sirène 12 V — phase distante UNIQUEMENT. GPIO34 / MQ-2 interdit. */

#define PIN_RELAY 23
/*
 * Relais 5 V optocouple (jumper LOW) + ESP32 3,3 V :
 *   Repos  = pin en ENTREE (haute impedance) — la bobine est eteinte.
 *   Alarme = pin en SORTIE LOW — la bobine colle.
 * Ne jamais forcer GPIO HIGH (3,3 V) pour eteindre : l'opto 5 V reste
 * passant et le relais reste ALIMENTE en permanence.
 *
 * 1 = jumper LOW (cas normal). 0 = jumper HIGH (IN HIGH = ON).
 */
#define RELAY_ACTIVE_LOW 1

#define DEVICE_ID "GW-ZONE-B"

/* Token appareil provisionné via POST /api/devices — jamais dans React */
#define DEVICE_TOKEN "15822b9f5b4d2c6ba4f10a1736472a2e6438bb943f0f3381559197c74064c473"

#define WIFI_SSID "Nathan Sky"
#define WIFI_PASSWORD "11111111"

/* IP LAN du PC (wlan0) — pas docker0 (172.17.0.1) */
#define API_BASE_URL "http://172.20.10.3:5000"

#define POLL_MS 400
#define HEARTBEAT_MS 5000
#define HTTP_TIMEOUT_MS 2000
#define HTTP_RETRIES 2
#define BACKOFF_MS 200
#define WIFI_RETRY_MS 3000
#define NTP_WAIT_MS 15000

/* Ignorer un ACTIVATE_SIREN trop vieux (file d'attente overnight / SOS déjà passé). */
#define COMMAND_MAX_AGE_MS 90000

#define SERIAL_BAUD 115200
