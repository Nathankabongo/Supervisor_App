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
    seed();
  }
  return db;
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
  `);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const h = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('supervisor', h, 'Jean Dupont', 'supervisor');
    db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('admin', bcrypt.hashSync('admin123',10), 'Admin', 'admin');
  }

  // Gateways (Infrastructure de base)
  const gw = db.prepare('INSERT OR IGNORE INTO lora_gateways (id,zone,signal,battery) VALUES (?,?,?,?)');
  ['A','B','C','D','E','F'].forEach((z,i) => gw.run(`GW-0${i+1}`, `ZONE ${z}`, 95, 85));

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

  console.log('✅ Base de données initialisée avec comptes utilisateurs et infrastructure de base');
}
