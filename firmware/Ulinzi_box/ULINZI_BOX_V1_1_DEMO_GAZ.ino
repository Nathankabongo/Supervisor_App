// ============================================================
// ULINZI BOX - V2.0 (Multi-Box Connectée à Supervisor_App)
// ESP32 DevKit + MQ-135 + MPU6050 + LCD I2C 16x2 + relais/sirene
// Wi-Fi AP+STA : Tableau de bord local + Liaison temps réel Backend
//
// Câblage matériel ULINZI BOX conservé à l'identique :
//  - MQ-135 AO      : GPIO34 (via pont diviseur)
//  - LED Bleue      : GPIO18 (système allumé)
//  - LED Verte      : GPIO19 (connecté à Supervisor_App)
//  - LED Rouge      : GPIO23 (danger / alarme verrouillée)
//  - Relais Sirène  : GPIO25 (relais)
//  - Bouton ACK     : GPIO27 (acquittement alarme locale -> GND)
//  - Bouton Watch   : GPIO26 (test/envoi forcé ou démo -> GND)
//  - I2C            : SDA = GPIO21, SCL = GPIO22 (MPU6050 + LCD 16x2)
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Wire.h>
#include <math.h>
#include <esp_task_wdt.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include "config.h"

// ---------------- Broches (câblage box inchangé) ----------------
const int MQ_PIN     = 34;   // MQ-135 AO (via pont diviseur !)
const int LED_BLUE   = 18;
const int LED_GREEN  = 19;   // Connectée à Supervisor_App (en ligne)
const int LED_RED    = 23;
const int RELAY_PIN  = 25;
const int BTN_ACK    = 27;   // bouton d'acquittement vers GND (INPUT_PULLUP)
const int BTN_WATCH  = 26;   // bouton envoi immédiat / test liaison vers GND
// I2C : SDA = GPIO21, SCL = GPIO22

// ---------------- Relais ----------------
const bool RELAY_ACTIVE_LOW = false;           // true si ton module est actif à LOW
const int  RELAY_ON  = RELAY_ACTIVE_LOW ? LOW  : HIGH;
const int  RELAY_OFF = RELAY_ACTIVE_LOW ? HIGH : LOW;

// ---------------- Gaz (MQ-135) : A CALIBRER ----------------
const unsigned long WARMUP_MS       = 180000UL;  // préchauffage à chaque démarrage (3 min mini)
const unsigned long BASELINE_MS     = 10000UL;   // durée de mesure de la base (air propre !)
const int           GAS_DELTA       = 20;        // DEMO : écart au-dessus de la base (à recalibrer)
const int           GAS_HYST        = 10;        // DEMO : marge de retour sous le seuil
const int           GAS_ABS_MAX     = 3300;      // seuil absolu de sécurité
const unsigned long GAS_CONFIRM_MS  = 1000UL;    // durée de dépassement avant alarme
const int           GAS_FAULT_LOW   = 20;        // lecture ~0   : capteur débranché
const int           GAS_FAULT_HIGH  = 4090;      // lecture ~max : capteur saturé

// ---------------- Vibrations (MPU6050) : A CALIBRER ----------------
const uint8_t       MPU_ADDR          = 0x68;
const float         VIB_RMS_THRESHOLD = 1.5f;    // m/s2 RMS (dynamique), à mesurer sur site
const float         VIB_RELEASE_RATIO = 0.7f;    // retour à la normale sous 70 % du seuil
const unsigned long VIB_HOLD_MS       = 1500UL;
const int           VIB_WINDOW        = 50;      // 50 échantillons x 10 ms = 0,5 s
const unsigned long MPU_PERIOD_MS     = 10UL;    // 100 Hz

// Un défaut capteur déclenche-t-il l'alarme ? (recommandé : true)
const bool FAULT_TRIGGERS_ALARM = true;

const int WDT_TIMEOUT_S = 8;

// ---------------- Objets ----------------
Adafruit_MPU6050 mpu;
hd44780_I2Cexp   lcd;
WebServer        server(80);
Preferences      prefs;

// ---------------- Etat capteurs ----------------
// Gaz
int   gasRaw = 0;                 // valeur filtrée
float gasFiltered = 0;
bool  gasFirst = true;
int   gasPhase = 0;               // 0 = chauffe, 1 = calibration, 2 = surveillance
float gasBaseline = 0;
long  baseSum = 0;
int   baseCount = 0;
unsigned long baseStart = 0;
bool  gasAbove = false;
unsigned long gasAboveSince = 0;
bool  gasAlarm = false;
bool  gasFault = false;
int   gasFaultCount = 0;
unsigned long lastGasMs = 0;

// Vibrations
bool  mpuOK = false;
float ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
float gravityLP = 0;
bool  gravityInit = false;
float sqBuf[VIB_WINDOW];
int   sqIdx = 0;
float vibRms = 0;
bool  vibAlarm = false;
unsigned long lastVibAbove = 0;
unsigned long lastMpuMs = 0, lastMpuPing = 0, lastMpuRetry = 0;

// Alarme locale & distante
bool dangerNow = false;
bool alarmLatched = false;
bool remoteSirenOn = false;
bool relayActive = false;

// Détection de fronts pour l'historique & alertes backend
bool prevGasAlarm = false, prevVibAlarm = false, prevGasFault = false, prevMpuFault = false;

// Boutons
bool btnPrev = HIGH;
unsigned long btnLast = 0;
bool btnTestPrev = HIGH;
unsigned long btnTestLast = 0;
const char* lcdMsg1 = "";
const char* lcdMsg2 = "";
unsigned long lcdMsgUntil = 0;

// LCD
bool lcdOK = false;
unsigned long lastLcdMs = 0, lastSerialMs = 0;

// Historique local
struct Event { uint32_t t; const char* msg; };
const int HIST_MAX = 10;
Event hist[HIST_MAX];
int histHead = 0, histCount = 0;

// ---------------- Etat réseau / Supervisor App ----------------
struct NetSnapshot {
  int   gasRaw;
  int   gasBaseline;
  int   gasThreshold;
  int   gasPhase;
  long  warmRemainingS;
  bool  gasAlarm;
  bool  gasFault;
  float vibRms;
  float vibThreshold;
  bool  vibAlarm;
  bool  mpuOK;
  float ax, ay, az, gx, gy, gz;
  bool  dangerNow;
  bool  alarmLatched;
  bool  relayActive;
  uint32_t uptimeMs;
};

struct PendingAlert {
  char type[20];
  char severity[12];
  char source[20];
  char sensorType[16];
  float sensorRaw;
  float threshold;
  bool siren;
  char message[96];
  char clientEventId[64];
};

static const int ALERT_Q_CAP = 8;
static PendingAlert alertQueue[ALERT_Q_CAP];
static int alertQHead = 0, alertQTail = 0, alertQCount = 0;
static uint32_t alertSeq = 0;
static uint32_t bootNonce = 0;

static SemaphoreHandle_t netMtx = nullptr;
static NetSnapshot sharedSnap = {};
static volatile bool netForceSync = false;
static volatile bool backendConnected = false;
static volatile bool wifiStaConnected = false;
static char deviceToken[96] = "";
static char lastCmdId[32] = "";
static char lastAlertId[48] = "";
static char lastAction[24] = "";
static uint64_t lastProcessDelayUs = 0;
static char staIpStr[24] = "0.0.0.0";

void logEvent(const char* msg) {
  hist[histHead].t = millis() / 1000;
  hist[histHead].msg = msg;
  histHead = (histHead + 1) % HIST_MAX;
  if (histCount < HIST_MAX) histCount++;
  Serial.print("[EVENT] ");
  Serial.println(msg);
}

float gasThresholdOn() {
  float t = gasBaseline + GAS_DELTA;
  if (t > GAS_ABS_MAX) t = GAS_ABS_MAX;
  return t;
}

void enqueueBackendAlert(const char* type, const char* severity, const char* source,
                         const char* sensorType, float sensorRaw, float threshold,
                         bool siren, const char* message) {
  if (!netMtx) return;
  if (xSemaphoreTake(netMtx, pdMS_TO_TICKS(20)) == pdTRUE) {
    if (alertQCount < ALERT_Q_CAP) {
      PendingAlert &item = alertQueue[alertQTail];
      snprintf(item.type, sizeof(item.type), "%s", type);
      snprintf(item.severity, sizeof(item.severity), "%s", severity);
      snprintf(item.source, sizeof(item.source), "%s", source);
      snprintf(item.sensorType, sizeof(item.sensorType), "%s", sensorType);
      item.sensorRaw = sensorRaw;
      item.threshold = threshold;
      item.siren = siren;
      snprintf(item.message, sizeof(item.message), "%s", message);
      alertSeq++;
      snprintf(item.clientEventId, sizeof(item.clientEventId), "%s-%s-%lu-%lu",
               BOX_ID, type, (unsigned long)bootNonce, (unsigned long)alertSeq);
      alertQTail = (alertQTail + 1) % ALERT_Q_CAP;
      alertQCount++;
      netForceSync = true;
    }
    xSemaphoreGive(netMtx);
  }
}

// ============================================================
// UTILITAIRES JSON LEGERS (sans dépendance ArduinoJson)
// ============================================================
static String jsonExtractString(const String& json, const char* key, int startFrom = 0) {
  String pattern = String("\"") + key + "\"";
  int k = json.indexOf(pattern, startFrom);
  if (k < 0) return "";
  int colon = json.indexOf(':', k + pattern.length());
  if (colon < 0) return "";
  int i = colon + 1;
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == '\t')) i++;
  if (i >= (int)json.length() || json[i] != '"') return "";
  int end = i + 1;
  while (end < (int)json.length()) {
    if (json[end] == '"' && json[end - 1] != '\\') break;
    end++;
  }
  if (end >= (int)json.length()) return "";
  return json.substring(i + 1, end);
}

static bool jsonExtractBool(const String& json, const char* key, bool defaultVal) {
  String pattern = String("\"") + key + "\"";
  int k = json.indexOf(pattern);
  if (k < 0) return defaultVal;
  int colon = json.indexOf(':', k + pattern.length());
  if (colon < 0) return defaultVal;
  int i = colon + 1;
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == '\t')) i++;
  if (json.startsWith("true", i)) return true;
  if (json.startsWith("false", i)) return false;
  return defaultVal;
}

// ============================================================
// PAGE WEB LOCALE (embarquée)
// ============================================================
const char INDEX_HTML[] PROGMEM = R"ULINZI(
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ULINZI BOX</title>
<style>
:root{color-scheme:dark;--bg:#0b1220;--card:#141f31;--muted:#9aabc0;--cyan:#58d8ee;--green:#37d996;--red:#ff5d68;--yellow:#ffca65}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:#f3f7ff;font-family:Arial,sans-serif}
header{padding:22px 18px;background:#111c2c;border-bottom:1px solid #29364b}
.wrap,main{max-width:960px;margin:auto}
main{padding:18px}
.brand{color:var(--cyan);font-size:12px;letter-spacing:3px}
h1{margin:8px 0;font-size:28px}
.subtitle,.small,.label,.unit{color:var(--muted);font-size:12px}
.small{line-height:1.6}
.status{background:var(--card);padding:16px;border-radius:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.pill{border-radius:20px;padding:8px 12px;font-size:12px;background:#27364b;color:var(--cyan)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.card{background:var(--card);border:1px solid #253249;border-radius:14px;padding:17px;min-width:0}
.value{font-size:27px;font-weight:bold;margin:12px 0 5px;overflow-wrap:anywhere}
.alert{border-color:#7c303c}.alert .value{color:var(--red)}
.good{border-color:#1f6b4d}.good .value{color:var(--green)}
.section{margin:24px 0 12px;font-size:15px}
.axis{display:flex;justify-content:space-between;gap:8px;margin-top:13px}
.axis div{background:#0b1220;border-radius:8px;padding:10px 6px;flex:1;text-align:center}
.axis b{display:block;margin-top:6px;font-size:16px}
canvas{width:100%;height:110px;background:#0b1220;border-radius:8px;margin-top:10px}
button{background:#27364b;color:#f3f7ff;border:1px solid #3a4c68;border-radius:10px;padding:11px 14px;font-size:14px;margin:10px 8px 0 0}
button:active{background:#37506f}
ul{list-style:none;margin:0;padding:0}
li{padding:8px 0;border-bottom:1px solid #253249;font-size:13px}
li span{color:var(--muted);margin-right:10px}
footer{text-align:center;color:var(--muted);font-size:11px;padding:24px}
@media(max-width:460px){.grid{grid-template-columns:1fr}h1{font-size:24px}}
</style>
</head>
<body>
<header><div class="wrap">
  <div class="brand">MINE SAFETY MONITOR · SUPERVISOR APP READY</div>
  <h1 id="boxTitle">ULINZI BOX</h1>
  <div class="subtitle" id="boxMeta">Tableau de bord embarqué · Version 2.0</div>
</div></header>
<main>
  <div class="status">
    <div><b>État du boîtier</b><div class="small" id="updated">Initialisation...</div></div>
    <div class="pill" id="connection">Connexion...</div>
  </div>

  <div class="grid">
    <div class="card" id="gasCard">
      <div class="label">MQ-135 · Signal analogique filtré</div>
      <div class="value" id="gas">--</div>
      <div class="unit">ADC brut (0-4095) · pas des ppm</div>
      <div class="small" id="gasStatus">...</div>
      <canvas id="gasChart" width="400" height="110"></canvas>
    </div>
    <div class="card" id="vibCard">
      <div class="label">MPU6050 · Vibrations (RMS 0,5 s)</div>
      <div class="value" id="vib">--</div>
      <div class="unit">m/s² dynamiques</div>
      <div class="small" id="vibStatus">...</div>
      <canvas id="vibChart" width="400" height="110"></canvas>
    </div>
    <div class="card">
      <div class="label">Accélération (m/s², gravité incluse)</div>
      <div class="axis">
        <div class="small">X<b id="ax">--</b></div>
        <div class="small">Y<b id="ay">--</b></div>
        <div class="small">Z<b id="az">--</b></div>
      </div>
    </div>
    <div class="card">
      <div class="label">Gyroscope (rad/s)</div>
      <div class="axis">
        <div class="small">GX<b id="gx">--</b></div>
        <div class="small">GY<b id="gy">--</b></div>
        <div class="small">GZ<b id="gz">--</b></div>
      </div>
    </div>
  </div>

  <div class="section">LIAISON SUPERVISOR APP</div>
  <div class="card" id="backendCard">
    <div class="label">Serveur central & identification</div>
    <div class="value" id="backend">--</div>
    <div class="small" id="backendDetail">...</div>
    <button onclick="post('/api/sync')">Forcer synchronisation serveur</button>
  </div>

  <div class="section">SÉCURITÉ</div>
  <div class="card" id="safetyCard">
    <div class="label">État global</div>
    <div class="value" id="safety">INITIALISATION</div>
    <div class="small" id="safetyDetail">...</div>
    <div class="small" id="sensors" style="margin-top:8px"></div>
    <button onclick="post('/api/ack')">Acquitter l'alarme locale</button>
    <button onclick="if(confirm('Recalibrer la base gaz ? Le boîtier doit être à l\'air propre.'))post('/api/calibrate')">Recalibrer la base gaz</button>
    <div class="small" style="margin-top:12px">
      LED bleue : système allumé · LED verte : connecté à Supervisor App · LED rouge : danger
      (fixe = danger actif, clignotante = danger terminé, en attente d'acquittement).
    </div>
  </div>

  <div class="section">ALERTES RÉCENTES</div>
  <div class="card"><ul id="hist"><li>Aucune</li></ul></div>

  <div class="small" style="margin-top:18px">
    Prototype : les valeurs MQ-135 sont brutes et ne remplacent pas un détecteur certifié
    de gaz miniers (CH₄, CO, O₂). Seuils à calibrer sur site.
  </div>
</main>
<footer>ULINZI BOX · Surveillance locale & Supervisor App</footer>

<script>
const N=60, gasH=[], vibH=[];
const $=id=>document.getElementById(id);
const set=(id,v)=>$(id).textContent=v;

function draw(id,arr,line,color){
  const c=$(id), x=c.getContext('2d'), w=c.width, h=c.height;
  x.clearRect(0,0,w,h);
  if(arr.length<2) return;
  const max=(Math.max(...arr,line||0)*1.15)||1;
  const Y=v=>h-(v/max)*(h-6)-3;
  if(line){
    x.strokeStyle='#ffca65'; x.setLineDash([5,4]); x.beginPath();
    x.moveTo(0,Y(line)); x.lineTo(w,Y(line)); x.stroke(); x.setLineDash([]);
  }
  x.strokeStyle=color; x.lineWidth=2; x.beginPath();
  arr.forEach((v,i)=>{const px=i*(w/(N-1)); i?x.lineTo(px,Y(v)):x.moveTo(px,Y(v));});
  x.stroke();
}
function push(a,v){a.push(v); if(a.length>N)a.shift();}
function fmt(s){const m=Math.floor(s/60),r=s%60;return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0');}

async function update(){
  try{
    const r=await fetch('/api',{cache:'no-store'});
    if(!r.ok) throw 0;
    const d=await r.json();

    set('boxTitle', d.boxId || 'ULINZI BOX');
    set('boxMeta', (d.boxName||'') + ' · ' + (d.zone||'') + ' · ' + (d.gallery||''));
    set('gas',d.gas);
    set('vib',d.vib.toFixed(2));
    ['ax','ay','az','gx','gy','gz'].forEach(k=>set(k,Number(d[k]).toFixed(2)));
    set('connection', d.backend ? 'SUPERVISOR OK' : 'MODE LOCAL');
    set('updated','Actualisé : '+new Date().toLocaleTimeString()+' · Uptime '+fmt(d.uptime));

    if(d.phase===0) set('gasStatus','Préchauffage du capteur : '+d.warm+' s restantes');
    else if(d.phase===1) set('gasStatus','Calibration de la base en cours...');
    else set('gasStatus','Base '+d.base+' · seuil '+d.thr+(d.gasDanger?' · SEUIL DÉPASSÉ':' · normal'));
    set('vibStatus',d.mpuOK?('Seuil '+d.vibThr.toFixed(1)+(d.vibDanger?' · VIBRATION ANORMALE':' · normal')):'MPU6050 non disponible');

    $('gasCard').classList.toggle('alert',d.gasDanger);
    $('vibCard').classList.toggle('alert',d.vibDanger);

    let s='SURVEILLANCE ACTIVE';
    if(d.danger) s='DANGER DÉTECTÉ';
    else if(d.remoteSiren) s='SIRÈNE DISTANTE ACTIVE';
    else if(d.latched) s='ALARME À ACQUITTER';
    else if(d.phase<2) s='INITIALISATION CAPTEUR GAZ';
    set('safety',s);
    set('safetyDetail','Gaz : '+(d.gasDanger?'ALERTE':'normal')+' | Vibrations : '+(d.vibDanger?'ALERTE':'normal')+' | Sirène : '+(d.relay?'ACTIVE':'ARRÊTÉE'));
    set('sensors','MQ-135 : '+(d.gasFault?'DÉFAUT':'OK')+' | MPU6050 : '+(d.mpuOK?'OK':'DÉFAUT')+' | Clients AP : '+d.clients);
    $('safetyCard').classList.toggle('alert',d.danger||d.latched||d.remoteSiren);

    set('backend', d.backend ? 'CONNECTÉE AU SERVEUR' : (d.wifiSta ? 'SERVEUR INJOIGNABLE' : 'WI-FI SERVEUR DÉCONNECTÉ'));
    set('backendDetail', 'ID: '+(d.boxId||'')+' | Zone: '+(d.zone||'')+' | IP LAN: '+(d.staIp||'0.0.0.0'));
    $('backendCard').classList.toggle('good', !!d.backend);

    push(gasH,d.gas); push(vibH,d.vib);
    draw('gasChart',gasH,d.phase===2?d.thr:0,'#58d8ee');
    draw('vibChart',vibH,d.vibThr,'#37d996');

    const ul=$('hist'); ul.innerHTML='';
    if(!d.hist.length) ul.innerHTML='<li>Aucune</li>';
    d.hist.forEach(e=>{const li=document.createElement('li');
      li.innerHTML='<span>T+'+fmt(e.t)+'</span>'; li.appendChild(document.createTextNode(e.m)); ul.appendChild(li);});
  }catch(e){
    set('connection','RECONNEXION...');
    set('updated','Impossible de lire les mesures');
  }
}
async function post(url){
  try{const r=await fetch(url,{method:'POST'});const d=await r.json();alert(d.msg);update();}
  catch(e){alert('Erreur de communication');}
}
update(); setInterval(update,1000);
</script>
</body>
</html>
)ULINZI";

// ============================================================
// LOGIQUE ALARME / ACTIONS
// ============================================================
bool tryAcknowledge() {
  if (!alarmLatched) return false;
  if (dangerNow) return false;
  alarmLatched = false;
  logEvent("Alarme locale acquittee");
  netForceSync = true;
  return true;
}

bool startCalibration() {
  if (dangerNow || alarmLatched) return false;
  if (gasPhase == 0 || gasPhase == 1) return false;
  gasPhase = 1;
  baseSum = 0;
  baseCount = 0;
  baseStart = millis();
  gasAlarm = false;
  gasAbove = false;
  logEvent("Recalibration gaz demandee");
  netForceSync = true;
  return true;
}

// ============================================================
// API WEB LOCALE JSON
// ============================================================
void handleApi() {
  unsigned long now = millis();
  long warm = (long)(WARMUP_MS - now) / 1000;
  if (warm < 0) warm = 0;

  String j;
  j.reserve(1400);
  j += "{\"boxId\":\"" + String(BOX_ID) + "\"";
  j += ",\"boxName\":\"" + String(BOX_NAME) + "\"";
  j += ",\"zone\":\"" + String(BOX_ZONE) + "\"";
  j += ",\"gallery\":\"" + String(BOX_GALLERY) + "\"";
  j += ",\"gas\":" + String(gasRaw);
  j += ",\"base\":" + String((int)gasBaseline);
  j += ",\"thr\":" + String((int)gasThresholdOn());
  j += ",\"phase\":" + String(gasPhase);
  j += ",\"warm\":" + String(warm);
  j += ",\"vib\":" + String(vibRms, 3);
  j += ",\"vibThr\":" + String(VIB_RMS_THRESHOLD, 2);
  j += ",\"ax\":" + String(ax, 3);
  j += ",\"ay\":" + String(ay, 3);
  j += ",\"az\":" + String(az, 3);
  j += ",\"gx\":" + String(gx, 3);
  j += ",\"gy\":" + String(gy, 3);
  j += ",\"gz\":" + String(gz, 3);
  j += ",\"mpuOK\":" + String(mpuOK ? "true" : "false");
  j += ",\"gasFault\":" + String(gasFault ? "true" : "false");
  j += ",\"gasDanger\":" + String(gasAlarm ? "true" : "false");
  j += ",\"vibDanger\":" + String(vibAlarm ? "true" : "false");
  j += ",\"danger\":" + String(dangerNow ? "true" : "false");
  j += ",\"latched\":" + String(alarmLatched ? "true" : "false");
  j += ",\"remoteSiren\":" + String(remoteSirenOn ? "true" : "false");
  j += ",\"relay\":" + String(relayActive ? "true" : "false");
  j += ",\"backend\":" + String(backendConnected ? "true" : "false");
  j += ",\"wifiSta\":" + String(wifiStaConnected ? "true" : "false");
  j += ",\"staIp\":\"" + String(staIpStr) + "\"";
  j += ",\"clients\":" + String(WiFi.softAPgetStationNum());
  j += ",\"uptime\":" + String(now / 1000);
  j += ",\"hist\":[";
  for (int i = 0; i < histCount; i++) {
    int idx = (histHead - 1 - i + HIST_MAX * 2) % HIST_MAX;
    if (i) j += ",";
    j += "{\"t\":" + String(hist[idx].t) + ",\"m\":\"" + hist[idx].msg + "\"}";
  }
  j += "]}";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", j);
}

void handleAck() {
  String msg;
  if (!alarmLatched)      msg = "Aucune alarme locale a acquitter.";
  else if (dangerNow)     msg = "Impossible : le danger est toujours present.";
  else { tryAcknowledge(); msg = "Alarme locale acquittee."; }
  server.send(200, "application/json", "{\"msg\":\"" + msg + "\"}");
}

void handleCalibrate() {
  String msg = startCalibration()
    ? "Calibration lancee (10 s)."
    : "Calibration impossible : chauffe en cours, danger ou alarme active.";
  server.send(200, "application/json", "{\"msg\":\"" + msg + "\"}");
}

void handleSync() {
  netForceSync = true;
  server.send(200, "application/json", "{\"msg\":\"Synchronisation Supervisor App declenchee.\"}");
}

void handleRoot() {
  server.send_P(200, "text/html; charset=utf-8", INDEX_HTML);
}

// ============================================================
// MPU6050
// ============================================================
void configureMpu() {
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
  gravityInit = false;
  for (int i = 0; i < VIB_WINDOW; i++) sqBuf[i] = 0;
  sqIdx = 0;
  vibRms = 0;
}

bool mpuPing() {
  Wire.beginTransmission(MPU_ADDR);
  return Wire.endTransmission() == 0;
}

void updateMpu(unsigned long now) {
  // Vérification de présence chaque seconde
  if (mpuOK && now - lastMpuPing >= 1000) {
    lastMpuPing = now;
    if (!mpuPing()) {
      mpuOK = false;
      vibAlarm = false;
      vibRms = 0;
    }
  }

  // Tentative de reconnexion toutes les 3 s
  if (!mpuOK) {
    if (now - lastMpuRetry >= 3000) {
      lastMpuRetry = now;
      if (mpu.begin(MPU_ADDR)) {
        mpuOK = true;
        configureMpu();
      }
    }
    return;
  }

  // Échantillonnage à cadence fixe (100 Hz)
  if (now - lastMpuMs < MPU_PERIOD_MS) return;
  lastMpuMs = now;

  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);
  ax = a.acceleration.x; ay = a.acceleration.y; az = a.acceleration.z;
  gx = g.gyro.x;         gy = g.gyro.y;         gz = g.gyro.z;

  // Accélération dynamique = norme - gravité estimée (filtre passe-bas)
  float mag = sqrtf(ax * ax + ay * ay + az * az);
  if (!gravityInit) { gravityLP = mag; gravityInit = true; }
  float dyn = mag - gravityLP;
  gravityLP += 0.01f * (mag - gravityLP);

  sqBuf[sqIdx] = dyn * dyn;
  sqIdx = (sqIdx + 1) % VIB_WINDOW;

  float sum = 0;
  for (int i = 0; i < VIB_WINDOW; i++) sum += sqBuf[i];
  vibRms = sqrtf(sum / VIB_WINDOW);

  // Seuil avec hystérésis et maintien
  if (vibRms >= VIB_RMS_THRESHOLD) {
    vibAlarm = true;
    lastVibAbove = now;
  } else if (vibAlarm && vibRms < VIB_RMS_THRESHOLD * VIB_RELEASE_RATIO &&
             now - lastVibAbove >= VIB_HOLD_MS) {
    vibAlarm = false;
  }
}

// ============================================================
// MQ-135
// ============================================================
void updateGas(unsigned long now) {
  if (now - lastGasMs < 100) return;
  lastGasMs = now;

  long s = 0;
  for (int i = 0; i < 16; i++) s += analogRead(MQ_PIN);
  int inst = (int)(s / 16);

  if (gasFirst) { gasFiltered = inst; gasFirst = false; }
  else gasFiltered += 0.3f * (inst - gasFiltered);
  gasRaw = (int)gasFiltered;

  // Détection capteur débranché / saturé (confirmée 2 s)
  if (inst <= GAS_FAULT_LOW || inst >= GAS_FAULT_HIGH) {
    if (gasFaultCount < 1000) gasFaultCount++;
  } else {
    gasFaultCount = 0;
  }
  gasFault = (gasFaultCount >= 20);

  // Phases
  if (gasPhase == 0) {
    if (now >= WARMUP_MS) {
      gasPhase = 1;
      baseSum = 0; baseCount = 0; baseStart = now;
    }
    gasAlarm = false;
    return;
  }

  if (gasPhase == 1) {
    baseSum += gasRaw;
    baseCount++;
    if (now - baseStart >= BASELINE_MS && baseCount > 0) {
      gasBaseline = (float)baseSum / baseCount;
      gasPhase = 2;
      logEvent("Base gaz calibree");
      netForceSync = true;
    }
    gasAlarm = false;
    return;
  }

  // Phase 2 : surveillance avec confirmation + hystérésis
  float thrOn  = gasThresholdOn();
  float thrOff = thrOn - GAS_HYST;

  if (!gasAlarm) {
    if (gasRaw >= thrOn) {
      if (!gasAbove) { gasAbove = true; gasAboveSince = now; }
      if (now - gasAboveSince >= GAS_CONFIRM_MS) gasAlarm = true;
    } else {
      gasAbove = false;
    }
  } else if (gasRaw < thrOff) {
    gasAlarm = false;
    gasAbove = false;
  }
}

// ============================================================
// EVALUATION GLOBALE, SORTIES & FILE D'ALERTES BACKEND
// ============================================================
void evaluate() {
  bool mpuFault = !mpuOK;

  if (gasAlarm && !prevGasAlarm) {
    logEvent("Danger gaz");
    char msg[96];
    snprintf(msg, sizeof(msg), "[%s] Seuil gaz MQ-135 depasse (%d >= %d)",
             BOX_ID, gasRaw, (int)gasThresholdOn());
    enqueueBackendAlert("gas", "high", "GAS_SENSOR", "MQ-135",
                        (float)gasRaw, gasThresholdOn(), true, msg);
  }
  if (!gasAlarm && prevGasAlarm) {
    logEvent("Gaz revenu normal");
    netForceSync = true;
  }
  if (vibAlarm && !prevVibAlarm) {
    logEvent("Vibration anormale");
    char msg[96];
    snprintf(msg, sizeof(msg), "[%s] Vibration anormale MPU6050 (%.2f m/s2)",
             BOX_ID, vibRms);
    enqueueBackendAlert("vibration", "high", "VIB_SENSOR", "MPU6050",
                        vibRms, VIB_RMS_THRESHOLD, true, msg);
  }
  if (!vibAlarm && prevVibAlarm) {
    logEvent("Vibrations normales");
    netForceSync = true;
  }
  if (gasFault && !prevGasFault) {
    logEvent("Defaut capteur MQ-135");
    char msg[96];
    snprintf(msg, sizeof(msg), "[%s] Defaut capteur gaz MQ-135 (val=%d)", BOX_ID, gasRaw);
    enqueueBackendAlert("sensor_fault", "medium", "SENSOR_FAULT", "MQ-135",
                        (float)gasRaw, 0.0f, FAULT_TRIGGERS_ALARM, msg);
  }
  if (!gasFault && prevGasFault) {
    logEvent("MQ-135 retabli");
    netForceSync = true;
  }
  if (mpuFault && !prevMpuFault) {
    logEvent("Defaut MPU6050");
    char msg[96];
    snprintf(msg, sizeof(msg), "[%s] Capteur vibrations MPU6050 deconnecte", BOX_ID);
    enqueueBackendAlert("sensor_fault", "medium", "SENSOR_FAULT", "MPU6050",
                        0.0f, 0.0f, FAULT_TRIGGERS_ALARM, msg);
  }
  if (!mpuFault && prevMpuFault) {
    logEvent("MPU6050 retabli");
    netForceSync = true;
  }

  prevGasAlarm = gasAlarm;  prevVibAlarm = vibAlarm;
  prevGasFault = gasFault;  prevMpuFault = mpuFault;

  bool fault = gasFault || mpuFault;
  dangerNow = gasAlarm || vibAlarm || (FAULT_TRIGGERS_ALARM && fault);

  if (dangerNow && !alarmLatched) alarmLatched = true;
}

void updateOutputs(unsigned long now) {
  digitalWrite(LED_BLUE, HIGH);
  digitalWrite(LED_GREEN, backendConnected ? HIGH : LOW);

  bool red;
  if (dangerNow || remoteSirenOn) red = true;                   // fixe : danger actif ou sirène distante
  else if (alarmLatched)          red = ((now / 500) % 2) == 0; // clignote : à acquitter
  else                            red = false;
  digitalWrite(LED_RED, red ? HIGH : LOW);

  relayActive = alarmLatched || remoteSirenOn;
  digitalWrite(RELAY_PIN, relayActive ? RELAY_ON : RELAY_OFF);
}

void readButton(unsigned long now) {
  bool b = digitalRead(BTN_ACK);
  if (b == LOW && btnPrev == HIGH && now - btnLast > 50) {
    btnLast = now;
    if (tryAcknowledge()) {
      lcdMsg1 = "ALARME ACQUITTEE";
      lcdMsg2 = "Synchronisation";
      lcdMsgUntil = now + 2000;
    }
  }
  btnPrev = b;

  // Bouton 26 : force une synchronisation immédiate avec Supervisor App
  bool w = digitalRead(BTN_WATCH);
  if (w == LOW && btnTestPrev == HIGH && now - btnTestLast > 50) {
    btnTestLast = now;
    netForceSync = true;
    lcdMsg1 = "SYNC SERVEUR...";
    lcdMsg2 = backendConnected ? "SUPERVISOR OK" : "TENTATIVE...";
    lcdMsgUntil = now + 2000;
  }
  btnTestPrev = w;
}

// ============================================================
// LCD
// ============================================================
void lcdLine(int row, const char* text) {
  char buf[17];
  snprintf(buf, sizeof(buf), "%-16.16s", text);
  lcd.setCursor(0, row);
  lcd.print(buf);
}

void updateLcd(unsigned long now) {
  if (!lcdOK || now - lastLcdMs < 500) return;
  lastLcdMs = now;

  if (now < lcdMsgUntil && !dangerNow && !remoteSirenOn) {
    lcdLine(0, lcdMsg1);
    lcdLine(1, lcdMsg2);
    return;
  }

  char l1[24], l2[24];

  // Ligne 2 : état / cause (commune aux pages)
  if (dangerNow || alarmLatched || remoteSirenOn) {
    if (remoteSirenOn && !dangerNow) snprintf(l2, sizeof(l2), "!SIRENE DISTANTE");
    else if (gasAlarm)               snprintf(l2, sizeof(l2), "!DANGER GAZ");
    else if (vibAlarm)               snprintf(l2, sizeof(l2), "!DANGER VIB");
    else if (gasFault)               snprintf(l2, sizeof(l2), "DEFAUT MQ-135");
    else if (!mpuOK)                 snprintf(l2, sizeof(l2), "DEFAUT MPU6050");
    else                             snprintf(l2, sizeof(l2), "ACQUITTER:BOUTON");
  } else if (gasPhase == 0) {
    long w = (long)(WARMUP_MS - now) / 1000;
    if (w < 0) w = 0;
    snprintf(l2, sizeof(l2), "Chauffe MQ %lds", w);
  } else if (gasPhase == 1) {
    snprintf(l2, sizeof(l2), "Calibration gaz");
  } else {
    snprintf(l2, sizeof(l2), backendConnected ? "API OK | Surv." : "LOCAL | Surv.");
  }

  // Pages alternées toutes les 3 s : 0 = gaz, 1 = vibrations, 2 = ID Box + réseau
  int page = (now / 3000) % 3;
  if (page == 0) {
    if (gasPhase == 2) snprintf(l1, sizeof(l1), "GAZ:%4d B:%4d", gasRaw, (int)gasBaseline);
    else               snprintf(l1, sizeof(l1), "GAZ:%4d", gasRaw);
  } else if (page == 1) {
    if (mpuOK) snprintf(l1, sizeof(l1), "VIB:%.2f m/s2", vibRms);
    else       snprintf(l1, sizeof(l1), "VIB: MPU ABSENT");
  } else {
    snprintf(l1, sizeof(l1), "%-16.16s", BOX_ID);
  }

  lcdLine(0, l1);
  lcdLine(1, l2);
}

// ============================================================
// SNAPSHOT CAPTEURS & RESEAU (Core 0 — non bloquant pour Core 1)
// ============================================================
static void refreshSnapshot(unsigned long now) {
  if (!netMtx) return;
  if (xSemaphoreTake(netMtx, pdMS_TO_TICKS(5)) == pdTRUE) {
    long warm = (long)(WARMUP_MS - now) / 1000;
    if (warm < 0) warm = 0;
    sharedSnap.gasRaw = gasRaw;
    sharedSnap.gasBaseline = (int)gasBaseline;
    sharedSnap.gasThreshold = (int)gasThresholdOn();
    sharedSnap.gasPhase = gasPhase;
    sharedSnap.warmRemainingS = warm;
    sharedSnap.gasAlarm = gasAlarm;
    sharedSnap.gasFault = gasFault;
    sharedSnap.vibRms = vibRms;
    sharedSnap.vibThreshold = VIB_RMS_THRESHOLD;
    sharedSnap.vibAlarm = vibAlarm;
    sharedSnap.mpuOK = mpuOK;
    sharedSnap.ax = ax; sharedSnap.ay = ay; sharedSnap.az = az;
    sharedSnap.gx = gx; sharedSnap.gy = gy; sharedSnap.gz = gz;
    sharedSnap.dangerNow = dangerNow;
    sharedSnap.alarmLatched = alarmLatched;
    sharedSnap.relayActive = relayActive;
    sharedSnap.uptimeMs = now;
    xSemaphoreGive(netMtx);
  }
}

static int httpPostJson(const String& url, const String& body, const char* token,
                        const char* provKey, String& response) {
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  http.useHTTP10(true);
  if (!http.begin(client, url)) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("Connection", "close");
  if (token && token[0]) {
    http.addHeader("Authorization", String("Bearer ") + token);
  }
  if (provKey && provKey[0]) {
    http.addHeader("X-Provision-Key", provKey);
  }
  int code = http.POST(body);
  response = http.getString();
  http.end();
  return code;
}

static int httpGetJson(const String& url, const char* token, String& response) {
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  http.useHTTP10(true);
  if (!http.begin(client, url)) return -1;
  http.addHeader("Accept", "application/json");
  http.addHeader("Connection", "close");
  if (token && token[0]) {
    http.addHeader("Authorization", String("Bearer ") + token);
  }
  int code = http.GET();
  response = http.getString();
  http.end();
  return code;
}

static bool registerBoxOnServer() {
  String url = String(API_BASE_URL) + "/api/devices/register";
  String body = String("{") +
    "\"deviceId\":\"" + BOX_ID + "\"," +
    "\"name\":\"" + BOX_NAME + "\"," +
    "\"zone\":\"" + BOX_ZONE + "\"," +
    "\"gallery\":\"" + BOX_GALLERY + "\"," +
    "\"deviceType\":\"ULINZI_BOX\"," +
    "\"provisionKey\":\"" + PROVISION_KEY + "\"" +
  "}";
  String resp;
  int code = httpPostJson(url, body, nullptr, PROVISION_KEY, resp);
  if (code >= 200 && code < 300) {
    String tok = jsonExtractString(resp, "deviceToken");
    if (tok.length() >= 16) {
      snprintf(deviceToken, sizeof(deviceToken), "%s", tok.c_str());
      prefs.begin("ulinzi", false);
      prefs.putString("token", deviceToken);
      prefs.putString("boxId", BOX_ID);
      prefs.end();
      Serial.printf("[NET] Box %s enregistree sur Supervisor_App (token OK)\n", BOX_ID);
      backendConnected = true;
      return true;
    }
  }
  Serial.printf("[NET] Echec enregistrement (%s) HTTP=%d\n", url.c_str(), code);
  backendConnected = false;
  return false;
}

static void applyServerCommands(const String& resp) {
  const uint64_t tStart = esp_timer_get_time();

  int posAct   = resp.lastIndexOf("\"ACTIVATE_SIREN\"");
  int posDeact = resp.lastIndexOf("\"DEACTIVATE_SIREN\"");

  if (posAct >= 0 || posDeact >= 0) {
    bool nextOn = (posAct > posDeact);
    int searchFrom = max(0, (nextOn ? posAct : posDeact) - 220);
    String cid = jsonExtractString(resp, "commandId", searchFrom);
    String aid = jsonExtractString(resp, "alertId", searchFrom);
    if (cid.length() == 0 || cid != String(lastCmdId)) {
      remoteSirenOn = nextOn;
      if (cid.length()) snprintf(lastCmdId, sizeof(lastCmdId), "%s", cid.c_str());
      if (aid.length()) snprintf(lastAlertId, sizeof(lastAlertId), "%s", aid.c_str());
      snprintf(lastAction, sizeof(lastAction), "%s", nextOn ? "ACTIVATE_SIREN" : "DEACTIVATE_SIREN");
      lastProcessDelayUs = esp_timer_get_time() - tStart;
      logEvent(nextOn ? "Sirene activee par Supervisor App" : "Sirene coupee par Supervisor App");
    }
    return;
  }

  // Fallback sur desiredSiren si aucune commande explicite en file
  bool desired = jsonExtractBool(resp, "desiredSiren", false);
  if (desired && !remoteSirenOn) {
    String aid = jsonExtractString(resp, "alertId");
    remoteSirenOn = true;
    if (aid.length()) snprintf(lastAlertId, sizeof(lastAlertId), "%s", aid.c_str());
    snprintf(lastAction, sizeof(lastAction), "ACTIVATE_SIREN");
    lastProcessDelayUs = esp_timer_get_time() - tStart;
    logEvent("Sirene synchronisee (alerte active)");
  }
}

static bool sendTelemetryToServer() {
  NetSnapshot s = {};
  if (xSemaphoreTake(netMtx, pdMS_TO_TICKS(50)) == pdTRUE) {
    s = sharedSnap;
    xSemaphoreGive(netMtx);
  }

  const char* alarmSrc = "NONE";
  if (s.gasAlarm) alarmSrc = "MQ135_GAS";
  else if (s.vibAlarm) alarmSrc = "MPU6050_VIB";
  else if (remoteSirenOn) alarmSrc = lastAction[0] ? lastAction : "REMOTE_SIREN";

  char body[768];
  snprintf(body, sizeof(body),
    "{"
      "\"deviceId\":\"%s\","
      "\"name\":\"%s\","
      "\"zone\":\"%s\","
      "\"gallery\":\"%s\","
      "\"deviceType\":\"ULINZI_BOX\","
      "\"ip\":\"%s\","
      "\"uptimeMs\":%lu,"
      "\"siren\":%s,"
      "\"danger\":%s,"
      "\"alarmLatched\":%s,"
      "\"alarmSource\":\"%s\","
      "\"lastCommandId\":\"%s\","
      "\"alertId\":\"%s\","
      "\"processDelayUs\":%llu,"
      "\"gas\":{"
        "\"raw\":%d,\"baseline\":%d,\"threshold\":%d,\"phase\":%d,"
        "\"warmupRemainingS\":%ld,\"alarm\":%s,\"fault\":%s"
      "},"
      "\"vibration\":{"
        "\"rms\":%.3f,\"threshold\":%.2f,\"alarm\":%s,\"mpuOk\":%s,"
        "\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
        "\"gx\":%.2f,\"gy\":%.2f,\"gz\":%.2f"
      "}"
    "}",
    BOX_ID, BOX_NAME, BOX_ZONE, BOX_GALLERY,
    staIpStr,
    (unsigned long)s.uptimeMs,
    s.relayActive ? "true" : "false",
    s.dangerNow ? "true" : "false",
    s.alarmLatched ? "true" : "false",
    alarmSrc,
    lastCmdId,
    lastAlertId,
    (unsigned long long)lastProcessDelayUs,
    s.gasRaw, s.gasBaseline, s.gasThreshold, s.gasPhase,
    s.warmRemainingS, s.gasAlarm ? "true" : "false", s.gasFault ? "true" : "false",
    s.vibRms, s.vibThreshold, s.vibAlarm ? "true" : "false", s.mpuOK ? "true" : "false",
    s.ax, s.ay, s.az, s.gx, s.gy, s.gz
  );

  String url = String(API_BASE_URL) + "/api/devices/" + BOX_ID + "/telemetry";
  String resp;
  int code = httpPostJson(url, String(body), deviceToken, nullptr, resp);
  if (code == 401) {
    deviceToken[0] = '\0';
    backendConnected = false;
    return false;
  }
  if (code >= 200 && code < 300) {
    backendConnected = true;
    applyServerCommands(resp);
    return true;
  }
  backendConnected = false;
  return false;
}

static bool pollCommandsFromServer() {
  String url = String(API_BASE_URL) + "/api/devices/" + BOX_ID + "/commands?ack=1";
  String resp;
  int code = httpGetJson(url, deviceToken, resp);
  if (code == 401) {
    deviceToken[0] = '\0';
    backendConnected = false;
    return false;
  }
  if (code >= 200 && code < 300) {
    backendConnected = true;
    applyServerCommands(resp);
    return true;
  }
  backendConnected = false;
  return false;
}

static void flushPendingAlerts() {
  while (true) {
    PendingAlert item;
    bool hasItem = false;
    if (xSemaphoreTake(netMtx, pdMS_TO_TICKS(20)) == pdTRUE) {
      if (alertQCount > 0) {
        item = alertQueue[alertQHead];
        hasItem = true;
      }
      xSemaphoreGive(netMtx);
    }
    if (!hasItem) break;

    char body[384];
    snprintf(body, sizeof(body),
      "{"
        "\"clientEventId\":\"%s\","
        "\"zone\":\"%s\","
        "\"source\":\"%s\","
        "\"type\":\"%s\","
        "\"severity\":\"%s\","
        "\"sensorType\":\"%s\","
        "\"sensorRaw\":%.2f,"
        "\"threshold\":%.2f,"
        "\"siren\":%s,"
        "\"message\":\"%s\""
      "}",
      item.clientEventId, BOX_ZONE, item.source, item.type, item.severity,
      item.sensorType, item.sensorRaw, item.threshold,
      item.siren ? "true" : "false", item.message
    );

    String url = String(API_BASE_URL) + "/api/devices/" + BOX_ID + "/alerts";
    String resp;
    int code = httpPostJson(url, String(body), deviceToken, nullptr, resp);
    if (code >= 200 && code < 300) {
      if (xSemaphoreTake(netMtx, pdMS_TO_TICKS(20)) == pdTRUE) {
        alertQHead = (alertQHead + 1) % ALERT_Q_CAP;
        alertQCount--;
        xSemaphoreGive(netMtx);
      }
      Serial.printf("[NET] Alerte transmise a Supervisor_App (%s)\n", item.type);
    } else {
      if (code == 401) deviceToken[0] = '\0';
      break;
    }
  }
}

void networkTask(void* param) {
  (void)param;
  uint32_t lastWifiTry = 0;
  uint32_t lastTel = 0;
  uint32_t lastPoll = 0;
  uint32_t lastRegTry = 0;

  for (;;) {
    uint32_t now = millis();
    if (WiFi.status() != WL_CONNECTED) {
      wifiStaConnected = false;
      backendConnected = false;
      snprintf(staIpStr, sizeof(staIpStr), "0.0.0.0");
      if (now - lastWifiTry >= WIFI_RETRY_MS || lastWifiTry == 0) {
        lastWifiTry = now;
        Serial.printf("[NET] Connexion Wi-Fi STA -> %s...\n", WIFI_STA_SSID);
        WiFi.begin(WIFI_STA_SSID, WIFI_STA_PASS);
      }
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    if (!wifiStaConnected) {
      wifiStaConnected = true;
      snprintf(staIpStr, sizeof(staIpStr), "%s", WiFi.localIP().toString().c_str());
      Serial.printf("[NET] Wi-Fi STA connecte (%s) -> Backend %s\n", staIpStr, API_BASE_URL);
    }

    if (!deviceToken[0]) {
      if (now - lastRegTry >= 3000 || lastRegTry == 0) {
        lastRegTry = now;
        registerBoxOnServer();
      }
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    flushPendingAlerts();

    if (netForceSync || (now - lastTel >= TELEMETRY_INTERVAL_MS) || lastTel == 0) {
      netForceSync = false;
      lastTel = now;
      sendTelemetryToServer();
    }

    if (now - lastPoll >= COMMAND_POLL_MS) {
      lastPoll = now;
      pollCommandsFromServer();
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  // Relais : niveau OFF AVANT de passer la broche en sortie
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  Serial.begin(115200);
  bootNonce = (uint32_t)esp_random();
  netMtx = xSemaphoreCreateMutex();

  // Charger le token mémorisé (ou token statique de config.h)
  if (strlen(STATIC_DEVICE_TOKEN) > 0) {
    snprintf(deviceToken, sizeof(deviceToken), "%s", STATIC_DEVICE_TOKEN);
  } else {
    prefs.begin("ulinzi", true);
    String savedId = prefs.getString("boxId", "");
    String savedTok = prefs.getString("token", "");
    prefs.end();
    if (savedId == String(BOX_ID) && savedTok.length() >= 16) {
      snprintf(deviceToken, sizeof(deviceToken), "%s", savedTok.c_str());
    }
  }

  pinMode(LED_BLUE, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BTN_ACK, INPUT_PULLUP);
  pinMode(BTN_WATCH, INPUT_PULLUP);

  digitalWrite(LED_BLUE, HIGH);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);

  analogReadResolution(12);
  analogSetPinAttenuation(MQ_PIN, ADC_11db);

  Wire.begin(21, 22);
  Wire.setTimeOut(50);

  // LCD (adresse détectée automatiquement par hd44780)
  lcdOK = (lcd.begin(16, 2) == 0);
  if (lcdOK) {
    lcd.backlight();
    lcdLine(0, BOX_ID);
    lcdLine(1, "Demarrage...");
  } else {
    Serial.println("ERREUR : LCD non detecte");
  }

  // MPU6050
  mpuOK = mpu.begin(MPU_ADDR);
  if (mpuOK) configureMpu();
  else Serial.println("ERREUR : MPU6050 non detecte");
  lastMpuRetry = millis();

  // Wi-Fi AP+STA : AP local pour diagnostic terrain + STA vers Supervisor_App
  WiFi.mode(ENABLE_LOCAL_AP ? WIFI_AP_STA : WIFI_STA);
  WiFi.setSleep(false);
  if (ENABLE_LOCAL_AP) {
    if (WiFi.softAP(BOX_ID, AP_PASSWORD)) {
      Serial.printf("Tableau de bord local (%s) : http://%s\n",
                    BOX_ID, WiFi.softAPIP().toString().c_str());
    } else {
      Serial.println("ERREUR : impossible de creer le Wi-Fi AP");
    }
  }

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api", HTTP_GET, handleApi);
  server.on("/api/ack", HTTP_POST, handleAck);
  server.on("/api/calibrate", HTTP_POST, handleCalibrate);
  server.on("/api/sync", HTTP_POST, handleSync);
  server.onNotFound([]() { server.send(404, "text/plain", "Page introuvable"); });
  server.begin();

  logEvent("Demarrage Ulinzi Box");

  // Tâche réseau dédiée sur Core 0 (n'impacte jamais le Watchdog ni MPU6050)
  xTaskCreatePinnedToCore(networkTask, "NetTask", 10240, nullptr, 1, nullptr, 0);

  // Watchdog matériel (compatible ESP32 Arduino core 2.x et 3.x)
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t wdtCfg = {
    .timeout_ms = (uint32_t)WDT_TIMEOUT_S * 1000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_reconfigure(&wdtCfg);
#else
  esp_task_wdt_init(WDT_TIMEOUT_S, true);
#endif
  esp_task_wdt_add(NULL);
}

// ============================================================
// LOOP (Core 1 — capteurs, relais, LCD, dashboard local)
// ============================================================
void loop() {
  esp_task_wdt_reset();
  server.handleClient();

  unsigned long now = millis();

  readButton(now);
  updateGas(now);
  updateMpu(now);
  evaluate();
  updateOutputs(now);
  updateLcd(now);
  refreshSnapshot(now);

  if (now - lastSerialMs >= 2000) {
    lastSerialMs = now;
    Serial.printf("[%s | %s] Gaz=%d base=%d phase=%d | Vib=%.2f mpu=%d | danger=%d remoteSiren=%d api=%d\n",
                  BOX_ID, BOX_ZONE,
                  gasRaw, (int)gasBaseline, gasPhase, vibRms, mpuOK,
                  dangerNow, remoteSirenOn, backendConnected);
  }

  delay(1);
}
