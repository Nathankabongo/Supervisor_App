import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'supervisor.db');
let db;

export function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Migration: Check if miners has watch_id column, drop and recreate if not
    try {
      const columns = db.prepare("PRAGMA table_info(miners)").all();
      if (columns.length > 0 && !columns.some(c => c.name === 'watch_id')) {
        console.log("Migration: ancienne table 'miners' détectée, réinitialisation de la base...");
        db.prepare("DROP TABLE IF EXISTS miners").run();
        db.prepare("DROP TABLE IF EXISTS trace_events").run();
        db.prepare("DROP TABLE IF EXISTS alerts").run();
      }
    } catch (e) {
      console.warn("Erreur vérification migration:", e);
    }

    initSchema();
    migrateZoneAlarm();
    seed();
  }
  return db;
}

function tableColumns(table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
}

function addColumnIfMissing(table, name, ddl) {
  if (!tableColumns(table).has(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

/** Migrations non destructives — alarme de zone ESP32 (MQ-2 / sirène). */
function migrateZoneAlarm() {
  addColumnIfMissing('alerts', 'source', "source TEXT DEFAULT 'LILYGO_INCIDENT'");
  addColumnIfMissing('alerts', 'device_id', 'device_id TEXT');
  addColumnIfMissing('alerts', 'sensor_type', 'sensor_type TEXT');
  addColumnIfMissing('alerts', 'sensor_raw', 'sensor_raw REAL');
  addColumnIfMissing('alerts', 'threshold', 'threshold REAL');
  addColumnIfMissing('alerts', 'siren', 'siren INTEGER DEFAULT 0');
  addColumnIfMissing('alerts', 'client_event_id', 'client_event_id TEXT');
  addColumnIfMissing('alerts', 'status', "status TEXT DEFAULT 'ACTIVE'");

  addColumnIfMissing('env_conditions', 'device_id', 'device_id TEXT');
  addColumnIfMissing('env_conditions', 'mq2_raw', 'mq2_raw REAL');
  addColumnIfMissing('env_conditions', 'mq2_threshold', 'mq2_threshold REAL');
  addColumnIfMissing('env_conditions', 'alarm', 'alarm INTEGER DEFAULT 0');
  addColumnIfMissing('env_conditions', 'alarm_source', 'alarm_source TEXT');
  addColumnIfMissing('env_conditions', 'siren', 'siren INTEGER DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      zone TEXT NOT NULL,
      gallery TEXT,
      status TEXT DEFAULT 'UNKNOWN',
      last_seen TEXT,
      token_hash TEXT,
      revoked INTEGER DEFAULT 0,
      siren INTEGER DEFAULT 0,
      alarm_source TEXT,
      active_alert_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS device_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      action TEXT NOT NULL,
      message TEXT,
      alert_id TEXT,
      client_command_id TEXT NOT NULL UNIQUE,
      consumed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_client_event_id
      ON alerts(client_event_id) WHERE client_event_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_alerts_zone_status ON alerts(zone, status);
    CREATE INDEX IF NOT EXISTS idx_device_commands_pending
      ON device_commands(device_id, consumed, id);
  `);

  addColumnIfMissing('device_commands', 'source', 'source TEXT');
  addColumnIfMissing('device_commands', 'execution_status', "execution_status TEXT DEFAULT 'QUEUED'");
  addColumnIfMissing('device_commands', 'received_at', 'received_at TEXT');
  addColumnIfMissing('device_commands', 'executed_at', 'executed_at TEXT');
  addColumnIfMissing('device_commands', 'confirmed_at', 'confirmed_at TEXT');
  addColumnIfMissing('device_commands', 'esp_received_at', 'esp_received_at TEXT');
  addColumnIfMissing('device_commands', 'gpio_at', 'gpio_at TEXT');
  addColumnIfMissing('device_commands', 'process_delay_us', 'process_delay_us INTEGER');
  addColumnIfMissing('device_commands', 'api_to_esp_ms', 'api_to_esp_ms INTEGER');
  addColumnIfMissing('devices', 'last_command_id', 'last_command_id TEXT');
  addColumnIfMissing('devices', 'last_command_status', 'last_command_status TEXT');
  addColumnIfMissing('devices', 'last_ip', 'last_ip TEXT');
  addColumnIfMissing('devices', 'listen_port', 'listen_port INTEGER');
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'supervisor',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS miners (
      id TEXT PRIMARY KEY, 
      name TEXT NOT NULL, 
      matricule TEXT UNIQUE NOT NULL,
      role TEXT, 
      phone TEXT,
      emergency_contact TEXT,
      blood_group TEXT,
      zone TEXT, 
      gallery TEXT, 
      photo TEXT,
      account_status TEXT DEFAULT 'Actif',
      watch_id TEXT UNIQUE DEFAULT NULL,
      status TEXT DEFAULT 'safe',
      heart_rate INTEGER DEFAULT 70, 
      temperature REAL DEFAULT 36.5,
      battery INTEGER DEFAULT 100, 
      x REAL, 
      y REAL,
      last_update TEXT DEFAULT (datetime('now')),
      is_in_service INTEGER DEFAULT 0,
      is_underground INTEGER DEFAULT 0,
      entry_time TEXT,
      exit_time TEXT
    );
    CREATE TABLE IF NOT EXISTS watches (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'available',
      last_seen TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gps_track_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      miner_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      zone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text','voice')),
      recipient_mode TEXT NOT NULL CHECK(recipient_mode IN ('all','zone','miner')),
      targets TEXT DEFAULT '[]', status TEXT DEFAULT 'sent',
      delivered_to TEXT DEFAULT '[]', read_by TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS trace_events (
      id TEXT PRIMARY KEY, miner_id TEXT NOT NULL, miner_name TEXT,
      event_type TEXT NOT NULL, zone TEXT NOT NULL, gallery TEXT,
      details TEXT, duration INTEGER, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS env_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, zone TEXT NOT NULL,
      temperature REAL, humidity REAL, co2_level REAL, dust_level REAL,
      noise_level REAL, wind_speed REAL, pressure REAL,
      status TEXT DEFAULT 'normal', updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lora_gateways (
      id TEXT PRIMARY KEY, zone TEXT, status TEXT DEFAULT 'online',
      signal INTEGER DEFAULT 95, battery INTEGER DEFAULT 85,
      last_heartbeat TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS extractions (
      id TEXT PRIMARY KEY, mineral TEXT NOT NULL, mineralIcon TEXT,
      quantity REAL DEFAULT 0, unit TEXT DEFAULT 'tonnes',
      todayQuantity REAL DEFAULT 0, yesterdayQuantity REAL DEFAULT 0,
      target REAL DEFAULT 0, zone TEXT, gallery TEXT,
      quality TEXT DEFAULT 'Standard', lastUpdate TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY, minerId TEXT, minerName TEXT,
      type TEXT, severity TEXT, message TEXT, zone TEXT,
      timestamp INTEGER, resolved INTEGER DEFAULT 0,
      predictedCause TEXT
    );

    /* Mine 4.0 Tables */
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT DEFAULT 'operating', battery INTEGER DEFAULT 90,
      fuel INTEGER DEFAULT 85, engine_hours REAL DEFAULT 1200,
      operator TEXT, zone TEXT, is_autonomous INTEGER DEFAULT 0,
      collision_risk TEXT DEFAULT 'low'
    );
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY, machine_id TEXT NOT NULL, machine_name TEXT NOT NULL,
      type TEXT NOT NULL, risk_score INTEGER DEFAULT 15,
      breakdown_date TEXT, component TEXT, status TEXT DEFAULT 'normal'
    );
    CREATE TABLE IF NOT EXISTS esg_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT DEFAULT (datetime('now')),
      co2_emissions REAL DEFAULT 12.4, water_usage REAL DEFAULT 450,
      water_recycled REAL DEFAULT 380, pm25 REAL DEFAULT 12.2, pm10 REAL DEFAULT 28.4,
      air_quality_status TEXT DEFAULT 'Excellente'
    );
    CREATE TABLE IF NOT EXISTS geotech_sensors (
      id TEXT PRIMARY KEY, zone TEXT NOT NULL, sensor_type TEXT NOT NULL,
      value REAL DEFAULT 0, status TEXT DEFAULT 'normal',
      last_microseism_hz REAL DEFAULT 12.0, dam_displacement_mm REAL DEFAULT 0.4
    );
    CREATE TABLE IF NOT EXISTS blasting_plans (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, zone TEXT NOT NULL,
      scheduled_time TEXT NOT NULL, status TEXT DEFAULT 'planned',
      explosives_kg REAL DEFAULT 250, safety_radius_m INTEGER DEFAULT 300
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      stock_quantity REAL DEFAULT 100, unit TEXT DEFAULT 'unités',
      min_stock REAL DEFAULT 20, rfid_tag TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_predictions (
      id TEXT PRIMARY KEY, target TEXT NOT NULL, risk_percentage INTEGER NOT NULL,
      estimated_timeframe TEXT NOT NULL, recommendation TEXT NOT NULL, category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blockchain_blocks (
      id TEXT PRIMARY KEY, block_index INTEGER NOT NULL, timestamp TEXT DEFAULT (datetime('now')),
      data_hash TEXT NOT NULL, miner_id TEXT, ppe_verified INTEGER DEFAULT 1,
      conflict_free INTEGER DEFAULT 1, child_labor_free INTEGER DEFAULT 1
    );

    /* 7th Pillar & Advanced Mine 4.0 Tables */
    CREATE TABLE IF NOT EXISTS dispatch_missions (
      id TEXT PRIMARY KEY, vehicle TEXT NOT NULL, origin TEXT NOT NULL,
      destination TEXT NOT NULL, status TEXT DEFAULT 'In Progress',
      eta TEXT DEFAULT '5 min', load_ton REAL DEFAULT 300
    );
    CREATE TABLE IF NOT EXISTS energy_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hydro_kw REAL DEFAULT 1420,
      diesel_lph REAL DEFAULT 850, solar_kw REAL DEFAULT 480,
      battery_pct REAL DEFAULT 92, cost_per_kwh REAL DEFAULT 0.082
    );
    CREATE TABLE IF NOT EXISTS water_sensors (
      id TEXT PRIMARY KEY, pump_id TEXT NOT NULL, location TEXT NOT NULL,
      flow_m3h REAL DEFAULT 140, pressure_bar REAL DEFAULT 4.2,
      basin_level_pct REAL DEFAULT 48, recycling_pct REAL DEFAULT 84.6,
      ph_level REAL DEFAULT 7.2, leaks_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS weather_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lightning_strikes_20km INTEGER DEFAULT 0,
      wind_speed_ms REAL DEFAULT 1.2, wind_direction TEXT DEFAULT 'Nord-Est',
      blast_permission TEXT DEFAULT 'AUTORISÉ', rain_forecast TEXT DEFAULT 'Nuageux sans pluie'
    );
    CREATE TABLE IF NOT EXISTS vision_cameras (
      id TEXT PRIMARY KEY, camera_code TEXT NOT NULL, location TEXT NOT NULL,
      status TEXT DEFAULT 'Optimal', ppe_status TEXT DEFAULT 'Conforme (100%)',
      anomalies_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS crisis_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT DEFAULT 'NORMAL',
      emergency_plan TEXT DEFAULT 'Aucun plan d''urgence actif',
      rescue_teams_count INTEGER DEFAULT 2, survival_refuges_count INTEGER DEFAULT 4,
      oxygen_hours INTEGER DEFAULT 48
    );
    CREATE TABLE IF NOT EXISTS director_kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT, oee_pct REAL DEFAULT 88.4,
      cost_per_ton REAL DEFAULT 24.50, ltifr REAL DEFAULT 0.00,
      monthly_prod_tons REAL DEFAULT 42500, ebitda_margin_pct REAL DEFAULT 42.6,
      accident_free_days INTEGER DEFAULT 450
    );
  `);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const h = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('supervisor', h, 'Jean Dupont', 'supervisor');
    db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('admin', bcrypt.hashSync('admin123',10), 'Admin', 'admin');
  }

  // Gateways LoRa seed (UI historique) — pas l'ESP32 zone
  const gw = db.prepare('INSERT OR IGNORE INTO lora_gateways (id,zone,signal,battery) VALUES (?,?,?,?)');
  ['A','B','C','D','E','F'].forEach((z,i) => gw.run(`GW-0${i+1}`, `ZONE ${z}`, 95, 85));

  db.prepare(`
    INSERT OR IGNORE INTO devices (id, zone, gallery, status, last_seen)
    VALUES ('GW-ZONE-B', 'ZONE B', 'Galerie_3_Nord', 'UNKNOWN', NULL)
  `).run();

  // Environmental conditions per zone
  const envCount = db.prepare('SELECT COUNT(*) as c FROM env_conditions').get().c;
  if (envCount === 0) {
    const env = db.prepare('INSERT INTO env_conditions (zone,temperature,humidity,co2_level,dust_level,noise_level,wind_speed,pressure,status) VALUES (?,?,?,?,?,?,?,?,?)');
    ['A','B','C','D','E','F'].forEach(z => {
      env.run(`ZONE ${z}`, 28.5, 60.0, 420, 0.5, 75, 1.2, 1015, 'normal');
    });
  }

  // Seed default miners if none exist
  const minerCount = db.prepare('SELECT COUNT(*) as c FROM miners').get().c;
  if (minerCount === 0) {
    const insertMiner = db.prepare(`
      INSERT INTO miners (id, name, matricule, role, phone, emergency_contact, blood_group, zone, photo, account_status, watch_id, status, is_in_service, is_underground)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertMiner.run('M001', 'Israel Lum', 'M001', 'Creuseur', '+243 812 345 678', '+243 899 999 999 (RH)', 'O+', 'ZONE B', null, 'Actif', null, 'safe', 0, 0);
    insertMiner.run('M002', 'Marc Ban', 'M002', 'Technicien', '+243 812 345 679', '+243 899 999 998 (Famille)', 'A-', 'ZONE E', null, 'Actif', null, 'safe', 0, 0);
    insertMiner.run('M003', 'Pierre Kal', 'M003', 'Transporteur', '+243 812 345 680', '+243 899 999 997 (Epouse)', 'B+', 'ZONE A', null, 'Actif', null, 'safe', 0, 0);
    insertMiner.run('M004', 'Sylvie Tsh', 'M004', 'Médecin', '+243 812 345 681', '+243 899 999 996 (Famille)', 'AB+', 'ZONE C', null, 'Actif', null, 'safe', 0, 0);
    insertMiner.run('M005', 'Christian Mba', 'M005', 'Superviseur', '+243 812 345 682', '+243 899 999 995 (Direction)', 'O-', 'ZONE B', null, 'Actif', null, 'safe', 0, 0);

    const insertWatch = db.prepare('INSERT OR IGNORE INTO watches (id, status) VALUES (?, ?)');
    insertWatch.run('WATCH-001', 'available');
    insertWatch.run('WATCH-002', 'available');
    insertWatch.run('WATCH-003', 'available');
  }

  // Seed Mine 4.0 vehicles
  const vehCount = db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c;
  if (vehCount === 0) {
    const v = db.prepare('INSERT INTO vehicles (id, name, type, status, battery, fuel, engine_hours, operator, zone, is_autonomous, collision_risk) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    v.run('VEH-01', 'Camion Dumper CAT 797F', 'Camion Dumper', 'operating', 95, 82, 3420, 'Robot AHS 01', 'ZONE B', 1, 'low');
    v.run('VEH-02', 'Pelle Hydraulique Komatsu PC8000', 'Pelle', 'operating', 90, 75, 4150, 'Pierre Kal', 'ZONE A', 0, 'low');
    v.run('VEH-03', 'Chargeuse LHD Sandvik LH517i', 'Chargeuse Tele-remote', 'operating', 88, 91, 1890, 'Télé-opérateur (Surface)', 'ZONE C', 1, 'low');
    v.run('VEH-04', 'Foreuse Autonome Epiroc Pit Viper', 'Foreuse ADS', 'standby', 100, 95, 920, 'Système ADS-02', 'ZONE D', 1, 'low');
    v.run('VEH-05', 'Bulldozer CAT D11', 'Bulldozer', 'operating', 85, 60, 5210, 'Marc Ban', 'ZONE B', 0, 'medium');
  }

  // Seed Mine 4.0 maintenance logs
  const maintCount = db.prepare('SELECT COUNT(*) as c FROM maintenance_logs').get().c;
  if (maintCount === 0) {
    const m = db.prepare('INSERT INTO maintenance_logs (id, machine_id, machine_name, type, risk_score, breakdown_date, component, status) VALUES (?,?,?,?,?,?,?,?)');
    m.run('MNT-101', 'VEH-05', 'Bulldozer CAT D11', 'Prédictive IA', 87, 'Dans 36 heures', 'Système Hydraulique / Chenilles', 'warning');
    m.run('MNT-102', 'CONV-12', 'Convoyeur Principal C-12', 'Vibration Élevée', 74, 'Dans 5 jours', 'Roulement Moteur Principal', 'warning');
    m.run('MNT-103', 'PUMP-04', 'Pompe d\'Évacuation P-04', 'Contrôle Routine', 12, 'Dans 24 jours', 'Joint d\'Étanchéité', 'normal');
  }

  // Seed Mine 4.0 ESG Metrics
  const esgCount = db.prepare('SELECT COUNT(*) as c FROM esg_metrics').get().c;
  if (esgCount === 0) {
    db.prepare('INSERT INTO esg_metrics (co2_emissions, water_usage, water_recycled, pm25, pm10, air_quality_status) VALUES (?,?,?,?,?,?)')
      .run(14.2, 520.0, 440.0, 11.5, 24.1, 'Conforme Standards ESG');
  }

  // Seed Geotech Sensors
  const geoCount = db.prepare('SELECT COUNT(*) as c FROM geotech_sensors').get().c;
  if (geoCount === 0) {
    const g = db.prepare('INSERT INTO geotech_sensors (id, zone, sensor_type, value, status, last_microseism_hz, dam_displacement_mm) VALUES (?,?,?,?,?,?,?)');
    g.run('GEO-01', 'ZONE B', 'Station Microsismique', 14.2, 'normal', 14.2, 0.3);
    g.run('GEO-02', 'Digue de Résidus #2', 'Radar Terrestre InSAR', 0.4, 'normal', 2.1, 0.4);
    g.run('GEO-03', 'Talus Nord Galerie 3', 'Piézomètre H14', 85.0, 'normal', 1.1, 0.1);
  }

  // Seed AI Predictions
  const aiCount = db.prepare('SELECT COUNT(*) as c FROM ai_predictions').get().c;
  if (aiCount === 0) {
    const a = db.prepare('INSERT INTO ai_predictions (id, target, risk_percentage, estimated_timeframe, recommendation, category) VALUES (?,?,?,?,?,?)');
    a.run('AI-01', 'Convoyeur C-12', 87, '36 heures', 'Remplacer le roulement moteur principal lors de la pause de quart.', 'Maintenance');
    a.run('AI-02', 'Galerie 4 Zone C', 65, '12 heures', 'Augmenter le débit de ventilation VoD à 120m³/min en raison du trafic diesel prévu.', 'Ventilation');
    a.run('AI-03', 'Bulldozer CAT D11', 78, '48 heures', 'Inspection du circuit de refroidissement recommandée.', 'Flotte');
  }

  // Seed Dispatch Missions
  if (db.prepare('SELECT COUNT(*) as c FROM dispatch_missions').get().c === 0) {
    const d = db.prepare('INSERT INTO dispatch_missions (id, vehicle, origin, destination, status, eta, load_ton) VALUES (?,?,?,?,?,?,?)');
    d.run('DISP-101', 'Camion CAT 797F (VEH-01)', 'Pelle Komatsu (ZONE A)', 'Concasseur Principal (ZONE C)', 'In Progress', '4 min', 340);
    d.run('DISP-102', 'Chargeuse LHD (VEH-03)', 'Galerie 3 (ZONE B)', 'Stock Minerai Nord', 'In Progress', '2 min', 180);
    d.run('DISP-103', 'Camion CAT 797F (VEH-05)', 'Pelle Komatsu (ZONE A)', 'Concasseur Secondaire', 'Queued', '8 min', 320);
  }

  // Seed Energy Metrics
  if (db.prepare('SELECT COUNT(*) as c FROM energy_metrics').get().c === 0) {
    db.prepare('INSERT INTO energy_metrics (hydro_kw, diesel_lph, solar_kw, battery_pct, cost_per_kwh) VALUES (?,?,?,?,?)')
      .run(1420, 850, 480, 92, 0.082);
  }

  // Seed Water Sensors
  if (db.prepare('SELECT COUNT(*) as c FROM water_sensors').get().c === 0) {
    const w = db.prepare('INSERT INTO water_sensors (id, pump_id, location, flow_m3h, pressure_bar, basin_level_pct, recycling_pct, ph_level, leaks_count) VALUES (?,?,?,?,?,?,?,?,?)');
    w.run('WAT-01', 'P-01', 'Station d\'Exhaure Galerie 3', 140, 4.2, 48, 84.6, 7.2, 0);
  }

  // Seed Weather Metrics
  if (db.prepare('SELECT COUNT(*) as c FROM weather_metrics').get().c === 0) {
    db.prepare('INSERT INTO weather_metrics (lightning_strikes_20km, wind_speed_ms, wind_direction, blast_permission, rain_forecast) VALUES (?,?,?,?,?)')
      .run(0, 1.2, 'Nord-Est', 'AUTORISÉ', 'Nuageux sans pluie');
  }

  // Seed Vision Cameras
  if (db.prepare('SELECT COUNT(*) as c FROM vision_cameras').get().c === 0) {
    const c = db.prepare('INSERT INTO vision_cameras (id, camera_code, location, status, ppe_status, anomalies_count) VALUES (?,?,?,?,?,?)');
    c.run('CAM-01', 'CAM-01', 'Portail Accès Galerie 1', 'Optimal', 'Conforme (100%)', 0);
    c.run('CAM-02', 'CAM-02', 'Convoyeur C-12 (Tête Moteur)', 'Optimal', 'Supervision Fumée/Feu Active', 0);
    c.run('CAM-03', 'CAM-03', 'Zone de Tir Galerie 4', 'Optimal', 'Périmètre Sécurisé (Intrusion: 0)', 0);
  }

  // Seed Crisis Scenarios
  if (db.prepare('SELECT COUNT(*) as c FROM crisis_scenarios').get().c === 0) {
    db.prepare('INSERT INTO crisis_scenarios (status, emergency_plan, rescue_teams_count, survival_refuges_count, oxygen_hours) VALUES (?,?,?,?,?)')
      .run('NORMAL', 'Aucun plan d\'urgence actif', 2, 4, 48);
  }

  // Seed Director KPIs
  if (db.prepare('SELECT COUNT(*) as c FROM director_kpis').get().c === 0) {
    db.prepare('INSERT INTO director_kpis (oee_pct, cost_per_ton, ltifr, monthly_prod_tons, ebitda_margin_pct, accident_free_days) VALUES (?,?,?,?,?,?)')
      .run(88.4, 24.50, 0.00, 42500, 42.6, 450);
  }

  console.log('✅ Base de données initialisée avec comptes utilisateurs et infrastructure Mine 4.0 complète');
}
