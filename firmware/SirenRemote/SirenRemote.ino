/**
 * SirenRemote — ESP32 Arduino IDE
 * Commandes distantes Supervisor_App → GPIO23 (relais actif LOW) → sirène 12 V
 *
 * Relais 5 V actif LOW (ESP32 3,3 V) :
 *   repos  = GPIO23 EN ENTREE (haute impedance) → bobine ETEINTE
 *   alarme = GPIO23 SORTIE LOW → bobine COLLEE
 * GPIO HIGH 3,3 V n'eteint PAS un relais 5 V (opto encore passant).
 * Au boot : jamais OUTPUT, jamais LOW, tant qu'ACTIVATE_SIREN n'est pas recu.
 *
 * MQ-2 / GPIO34 : NON UTILISE (phase suspendue)
 *
 * Lib requise : ArduinoJson (bblanchon) >= 7
 * Carte : ESP32 Dev Module
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <sys/time.h>
#include <esp_timer.h>
#include "config.h"

static bool sirenOn = false;
static bool ntpSynced = false;
static bool ntpStarted = false;
static bool ntpFailLogged = false;
static String lastCommandId = "";
static String lastClientCommandId = "";
static String lastAlertId = "";
static String lastAction = "";
static String lastCreatedAt = "";
static String lastReceivedAt = "";
static String lastGpioAt = "";
static int64_t lastApiToEspMs = -1;
static uint64_t lastProcessDelayUs = 0;

static uint32_t lastPollMs = 0;
static uint32_t lastHbMs = 0;
static uint32_t lastWifiAttemptMs = 0;
static uint32_t ntpStartMs = 0;

static const char* gpio23Label() {
  return sirenOn ? "LOW" : "HZ";
}

/* Repos = haute impedance (bobine eteinte). Alarme = sink LOW. */
static void relaySet(bool alarmOn) {
#if RELAY_ACTIVE_LOW
  if (alarmOn) {
    digitalWrite(PIN_RELAY, LOW);
    pinMode(PIN_RELAY, OUTPUT);
  } else {
    pinMode(PIN_RELAY, INPUT);
  }
#else
  digitalWrite(PIN_RELAY, alarmOn ? HIGH : LOW);
  pinMode(PIN_RELAY, OUTPUT);
#endif
  sirenOn = alarmOn;
}

static void relayIdle() {
  relaySet(false);
}

static const char* isoNowMs(char* buf, size_t len) {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  if (tv.tv_sec < 1700000000L) {
    snprintf(buf, len, "uptime-%llu-us", (unsigned long long)esp_timer_get_time());
    return buf;
  }
  struct tm tmUtc;
  gmtime_r(&tv.tv_sec, &tmUtc);
  snprintf(buf, len, "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
           tmUtc.tm_year + 1900, tmUtc.tm_mon + 1, tmUtc.tm_mday,
           tmUtc.tm_hour, tmUtc.tm_min, tmUtc.tm_sec,
           (int)(tv.tv_usec / 1000));
  return buf;
}

static int64_t parseIsoToEpochMs(const char* iso) {
  if (!iso || !iso[0] || iso[0] == 'u') return -1;
  int y = 0, Mo = 0, d = 0, h = 0, mi = 0, s = 0, ms = 0;
  int n = sscanf(iso, "%d-%d-%dT%d:%d:%d.%d", &y, &Mo, &d, &h, &mi, &s, &ms);
  if (n < 6) {
    n = sscanf(iso, "%d-%d-%dT%d:%d:%d", &y, &Mo, &d, &h, &mi, &s);
    ms = 0;
  }
  if (n < 6) {
    n = sscanf(iso, "%d-%d-%d %d:%d:%d", &y, &Mo, &d, &h, &mi, &s);
    ms = 0;
  }
  if (n < 6) return -1;
  while (ms > 999) ms /= 10;
  struct tm t = {};
  t.tm_year = y - 1900;
  t.tm_mon = Mo - 1;
  t.tm_mday = d;
  t.tm_hour = h;
  t.tm_min = mi;
  t.tm_sec = s;
  time_t sec = mktime(&t);
  if (sec < 0) return -1;
  return (int64_t)sec * 1000 + ms;
}

static void startNtp() {
  setenv("TZ", "UTC0", 1);
  tzset();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  ntpStarted = true;
  ntpFailLogged = false;
  ntpStartMs = millis();
}

static void pollNtp() {
  if (ntpSynced || !ntpStarted) return;
  time_t nowSec = time(nullptr);
  if (nowSec > 1700000000L) {
    ntpSynced = true;
    char ts[40];
    isoNowMs(ts, sizeof(ts));
    Serial.printf("[NTP] sync OK %s — horloges API/ESP comparables\n", ts);
    return;
  }
  if (!ntpFailLogged && millis() - ntpStartMs > NTP_WAIT_MS) {
    ntpFailLogged = true;
    Serial.println("[NTP] ECHEC — ne pas comparer API createdAt et heure ESP");
    Serial.println("[NTP] Le delai local reception→GPIO (us) reste valide");
  }
}

static bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!ntpStarted) startNtp();
    return true;
  }
  const uint32_t now = millis();
  if (now - lastWifiAttemptMs < WIFI_RETRY_MS) return false;
  lastWifiAttemptMs = now;
  ntpSynced = false;
  ntpStarted = false;
  ntpFailLogged = false;
  Serial.println("[NET] WiFi reconnect...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000UL) {
    delay(200);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[NET] WiFi OK %s — poll commandes immediat (NTP en arriere-plan)\n",
                  WiFi.localIP().toString().c_str());
    startNtp();
    return true;
  }
  Serial.println("[NET] WiFi OFF — pas de commande distante, relais au repos (inchange)");
  return false;
}

static bool httpRequest(const char* method, const String& url, const String& body, String& response) {
  for (int attempt = 1; attempt <= HTTP_RETRIES; ++attempt) {
    if (!ensureWifi()) return false;
    WiFiClient client;
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.setConnectTimeout(HTTP_TIMEOUT_MS);
    http.setReuse(false);
    http.useHTTP10(true);
    if (!http.begin(client, url)) {
      Serial.printf("[HTTP] begin fail attempt=%d url=%s\n", attempt, url.c_str());
      delay(BACKOFF_MS * attempt);
      continue;
    }
    http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
    http.addHeader("Accept", "application/json");
    http.addHeader("Connection", "close");
    int code = -1;
    if (strcmp(method, "GET") == 0) {
      code = http.GET();
    } else {
      http.addHeader("Content-Type", "application/json");
      code = http.POST(body);
    }
    response = http.getString();
    http.end();
    if (code >= 200 && code < 300) {
      return true;
    }
    Serial.printf("[HTTP] %s %s code=%d attempt=%d body=%s\n",
                  method, url.c_str(), code, attempt, response.c_str());
    if (code == 401 || code == 403) {
      Serial.println("[HTTP] token appareil refuse — arret retries");
      return false;
    }
    delay(BACKOFF_MS * attempt);
  }
  return false;
}

static void printSirenBanner(
    const char* commandId,
    const char* alertId,
    const char* createdAt,
    const char* receivedAt,
    int64_t apiToEspMs,
    uint64_t processDelayUs,
    bool on
) {
  Serial.println("========================================");
  Serial.println("SIREN COMMAND");
  Serial.println("========================================");
  Serial.printf("commandId : %s\n", commandId);
  Serial.printf("alertId   : %s\n", alertId);
  Serial.println();
  Serial.printf("API created : %s\n", createdAt);
  Serial.printf("ESP received: %s\n", receivedAt);
  if (!ntpSynced) {
    Serial.println("API → ESP32 : n/a (NTP non synchronise — horloges non comparables)");
  } else if (apiToEspMs < 0) {
    Serial.printf("API → ESP32 : %lld ms  << HORLOGE DECALEE (negatif)\n", (long long)apiToEspMs);
  } else {
    Serial.printf("API → ESP32 : %lld ms\n", (long long)apiToEspMs);
  }
  Serial.println();
  Serial.printf("GPIO23      : %s\n", on ? "LOW (sortie)" : "HZ (entree)");
  Serial.printf("RELAIS      : %s\n", on ? "COLLE (alarme)" : "ETEINT (repos)");
  Serial.printf("SIRENE      : %s  (commande GPIO, pas preuve acoustique)\n", on ? "ON" : "OFF");
  Serial.printf("Delai local reception→GPIO : %llu us (%.3f ms)\n",
                (unsigned long long)processDelayUs,
                processDelayUs / 1000.0);
  Serial.println("========================================");
}

static void applyCommand(JsonObject cmd) {
  const uint64_t tReception = esp_timer_get_time();

  const char* action = cmd["action"] | cmd["command"] | "";
  const char* commandId = cmd["commandId"] | "";
  const char* clientCommandId = cmd["clientCommandId"] | "";
  const char* alertId = cmd["alertId"] | "";
  const char* deviceId = cmd["deviceId"] | "";
  const char* createdAt = cmd["createdAt"] | cmd["issuedAt"] | "";

  if (deviceId[0] && strcmp(deviceId, DEVICE_ID) != 0) {
    Serial.println("[CMD] ignore — deviceId different (relais inchange)");
    return;
  }
  if ((commandId[0] && lastCommandId == commandId) ||
      (clientCommandId[0] && lastClientCommandId == clientCommandId)) {
    Serial.println("[CMD] ignore GPIO — deja executee (idempotence)");
    return;
  }

  bool on = false;
  if (strcmp(action, "ACTIVATE_SIREN") == 0) {
    on = true;
  } else if (strcmp(action, "DEACTIVATE_SIREN") == 0) {
    on = false;
  } else {
    Serial.printf("[CMD] inconnue action=%s — relais au repos conserve\n", action);
    return;
  }

  const bool skipAge = cmd["skipAge"] | false;
  if (on && ntpSynced && !skipAge) {
    char nowBuf[40];
    isoNowMs(nowBuf, sizeof(nowBuf));
    const int64_t createdMs = parseIsoToEpochMs(createdAt);
    const int64_t nowMs = parseIsoToEpochMs(nowBuf);
    if (createdMs > 0 && nowMs > 0 && (nowMs - createdMs) > (int64_t)COMMAND_MAX_AGE_MS) {
      Serial.printf("[CMD] ACTIVATE_SIREN ignore — trop vieux (%lld ms) relais REPOS\n",
                    (long long)(nowMs - createdMs));
      lastCommandId = commandId;
      lastClientCommandId = clientCommandId;
      if (!sirenOn) relayIdle();
      return;
    }
  }

  relaySet(on);
  const uint64_t tActivation = esp_timer_get_time();
  lastProcessDelayUs = tActivation - tReception;

  char receivedAt[40];
  char gpioAt[40];
  isoNowMs(receivedAt, sizeof(receivedAt));
  isoNowMs(gpioAt, sizeof(gpioAt));

  int64_t apiToEspMs = -1;
  const int64_t createdMs = parseIsoToEpochMs(createdAt);
  const int64_t receivedMs = parseIsoToEpochMs(receivedAt);
  if (ntpSynced && createdMs > 0 && receivedMs > 0) {
    apiToEspMs = receivedMs - createdMs;
  }

  lastCommandId = commandId;
  lastClientCommandId = clientCommandId;
  lastAlertId = alertId;
  lastAction = action;
  lastCreatedAt = createdAt;
  lastReceivedAt = receivedAt;
  lastGpioAt = gpioAt;
  lastApiToEspMs = apiToEspMs;
  lastHbMs = 0;

  Serial.printf("[T2] CMD_RECEIVED us=%llu %s\n", (unsigned long long)tReception, receivedAt);
  Serial.printf("[T3] GPIO23 %s us=%llu delay=%llu us %s\n",
                on ? "LOW" : "HZ",
                (unsigned long long)tActivation,
                (unsigned long long)lastProcessDelayUs,
                gpioAt);
  printSirenBanner(commandId, alertId, createdAt, receivedAt, apiToEspMs, lastProcessDelayUs, on);
}

static void applyDesiredSiren(JsonDocument& doc) {
  JsonVariant v = doc["desiredSiren"];
  if (v.isNull()) return;

  const bool desired = v.as<bool>();
  String alertId = "";
  String createdAt = "";
  String message = "";
  JsonVariant alert = doc["alert"];
  if (alert.is<JsonObject>()) {
    alertId = alert["alertId"] | alert["id"] | "";
    createdAt = alert["createdAt"] | "";
    message = alert["message"] | "";
  }

  JsonDocument cmd;
  if (desired) {
    if (sirenOn && alertId.length() && lastAlertId == alertId) return;
    cmd["action"] = "ACTIVATE_SIREN";
    cmd["command"] = "ACTIVATE_SIREN";
    cmd["commandId"] = alertId.length() ? (String("state-") + alertId) : String("state-on");
    cmd["alertId"] = alertId;
    cmd["createdAt"] = createdAt;
    cmd["deviceId"] = DEVICE_ID;
    cmd["message"] = message;
    cmd["skipAge"] = true;
    applyCommand(cmd.as<JsonObject>());
    return;
  }
  /* OFF uniquement via commande DEACTIVATE_SIREN, pas via desiredSiren=false. */
}

static void ingestApiPayload(JsonDocument& doc) {
  applyDesiredSiren(doc);
  JsonArray cmds = doc["commands"].as<JsonArray>();
  if (cmds.isNull()) cmds = doc["pendingCommands"].as<JsonArray>();
  if (cmds.isNull()) return;
  for (JsonObject c : cmds) {
    applyCommand(c);
  }
}

static void pollCommands() {
  String url = String(API_BASE_URL) + "/api/devices/" + DEVICE_ID + "/commands?ack=1";
  String response;
  if (!httpRequest("GET", url, "", response)) return;

  JsonDocument doc;
  if (deserializeJson(doc, response)) {
    Serial.println("[POLL] JSON invalide");
    Serial.println(response);
    return;
  }
  const bool desired = doc["desiredSiren"] | false;
  const char* alertId = "";
  JsonVariant alert = doc["alert"];
  if (alert.is<JsonObject>()) {
    alertId = alert["alertId"] | alert["id"] | "";
  }
  JsonArray cmds = doc["commands"].as<JsonArray>();
  const size_t n = cmds.isNull() ? 0 : cmds.size();
  Serial.printf("[POLL] API ok desiredSiren=%d cmds=%u alert=%s\n",
                desired ? 1 : 0, (unsigned)n, alertId);
  ingestApiPayload(doc);
}

static void sendTelemetry() {
  char ts[40];
  isoNowMs(ts, sizeof(ts));
  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["siren"] = sirenOn;
  doc["gpio23"] = gpio23Label();
  doc["lastCommandId"] = lastCommandId;
  doc["lastClientCommandId"] = lastClientCommandId;
  doc["alertId"] = lastAlertId;
  doc["alarmSource"] = lastAction;
  doc["createdAt"] = lastCreatedAt;
  doc["receivedAt"] = lastReceivedAt;
  doc["executedAt"] = lastGpioAt;
  doc["gpioAt"] = lastGpioAt;
  doc["processDelayUs"] = lastProcessDelayUs;
  if (lastApiToEspMs >= 0) {
    doc["apiToEspMs"] = lastApiToEspMs;
  }
  doc["ntpSynced"] = ntpSynced;
  doc["timestamp"] = ts;
  doc["uptimeMs"] = millis();
  String body;
  serializeJson(doc, body);

  String url = String(API_BASE_URL) + "/api/devices/" + DEVICE_ID + "/telemetry";
  String response;
  if (httpRequest("POST", url, body, response)) {
    Serial.printf("[HB] telemetry OK siren=%d lastCommandId=%s alertId=%s receivedAt=%s\n",
                  sirenOn ? 1 : 0, lastCommandId.c_str(), lastAlertId.c_str(), lastReceivedAt.c_str());
    JsonDocument ack;
    if (!deserializeJson(ack, response)) {
      ingestApiPayload(ack);
    }
  }
}

void setup() {
  /* Relais ETEINT avant tout : pin en entree, pas de 3,3 V force. */
  relayIdle();

  Serial.begin(SERIAL_BAUD);
  delay(200);

  setenv("TZ", "UTC0", 1);
  tzset();

  Serial.println("================================");
  Serial.println("  SIREN REMOTE — GPIO23 relais 5V actif LOW");
  Serial.println("  Relais ETEINT (pin HZ) tant qu'aucune alerte recue");
  Serial.println("  MQ-2 / GPIO34 SUSPENDU");
  Serial.printf("  device=%s poll=%d ms maxAge=%d ms\n", DEVICE_ID, POLL_MS, COMMAND_MAX_AGE_MS);
  Serial.println("================================");
  if (String(DEVICE_TOKEN) == "CHANGE_ME") {
    Serial.println("[FATAL] DEVICE_TOKEN non configure dans config.h");
  }
  WiFi.mode(WIFI_STA);
  if (ensureWifi()) {
    pollCommands();
    lastPollMs = millis();
  }
}

void loop() {
  pollNtp();
  const uint32_t now = millis();
  if (now - lastPollMs >= POLL_MS) {
    lastPollMs = now;
    pollCommands();
  }
  if (now - lastHbMs >= HEARTBEAT_MS) {
    lastHbMs = now;
    sendTelemetry();
  }
}
