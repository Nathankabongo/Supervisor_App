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
      id TEXT PRIMARY KEY, name TEXT NOT NULL, matricule TEXT UNIQUE NOT NULL,
      role TEXT, zone TEXT, gallery TEXT, status TEXT DEFAULT 'safe',
      heart_rate INTEGER DEFAULT 70, temperature REAL DEFAULT 36.5,
      battery INTEGER DEFAULT 100, x REAL, y REAL,
      last_update TEXT DEFAULT (datetime('now'))
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
  `);
}

function seed() {
  if (db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0) return;
  const h = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('supervisor', h, 'Jean Dupont', 'supervisor');
  db.prepare('INSERT INTO users (username,password,name,role) VALUES (?,?,?,?)').run('admin', bcrypt.hashSync('admin123',10), 'Admin', 'admin');

  const ins = db.prepare('INSERT OR IGNORE INTO miners (id,name,matricule,role,zone,gallery,status,heart_rate,temperature,battery,x,y) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const tx = db.transaction((rows) => rows.forEach(r => ins.run(...r)));
  tx([
    ['MIN-001','Amadou Diallo','MAT-001','Foreur','ZONE A','Galerie A1','safe',72,36.5,85,165,130],
    ['MIN-002','Ibrahim Sow','MAT-002','Opérateur','ZONE A','Galerie A1','safe',68,36.3,67,190,150],
    ['MIN-003','Mamadou Keita','MAT-003','Technicien','ZONE B','Galerie B2','safe',75,36.7,92,425,130],
    ['MIN-004','Ousmane Traoré','MAT-004','Ingénieur','ZONE B','Galerie B2','warning',95,37.2,45,450,140],
    ['MIN-005','Cheikh Diop','MAT-005','Foreur','ZONE C','Galerie C1','safe',70,36.4,78,675,130],
    ['MIN-006','Abdoulaye Ndiaye','MAT-006','Sécurité','ZONE C','Galerie C1','safe',65,36.2,90,700,150],
    ['MIN-007','Moussa Ba','MAT-007','Opérateur','ZONE D','Galerie D3','safe',78,36.6,72,165,360],
    ['MIN-008','Samba Fall','MAT-008','Foreur','ZONE D','Galerie D3','danger',110,38.1,33,180,370],
    ['MIN-009','Boubacar Sy','MAT-009','Technicien','ZONE E','Galerie E2','safe',73,36.5,88,425,400],
    ['MIN-010','Lamine Gueye','MAT-010','Opérateur','ZONE E','Galerie E2','warning',88,37.0,56,450,410],
    ['MIN-011','Pape Sarr','MAT-011','Ingénieur','ZONE F','Galerie F1','safe',69,36.3,81,675,400],
    ['MIN-012','Aliou Mbaye','MAT-012','Sécurité','ZONE F','Galerie F1','safe',71,36.4,64,700,420],
  ]);

  // Gateways
  const gw = db.prepare('INSERT OR IGNORE INTO lora_gateways (id,zone,signal,battery) VALUES (?,?,?,?)');
  ['A','B','C','D','E','F'].forEach((z,i) => gw.run(`GW-0${i+1}`, `ZONE ${z}`, 90+Math.floor(Math.random()*10), 65+Math.floor(Math.random()*30)));

  // Environmental conditions per zone
  const env = db.prepare('INSERT INTO env_conditions (zone,temperature,humidity,co2_level,dust_level,noise_level,wind_speed,pressure,status) VALUES (?,?,?,?,?,?,?,?,?,?)');
  ['A','B','C','D','E','F'].forEach(z => {
    const temp = 28 + Math.random() * 8;
    const hum = 60 + Math.random() * 30;
    const co2 = 400 + Math.random() * 200;
    const dust = 0.5 + Math.random() * 2;
    const noise = 70 + Math.random() * 25;
    const status = temp > 33 || co2 > 500 || dust > 1.5 ? 'warning' : 'normal';
    env.run(`ZONE ${z}`, Math.round(temp*10)/10, Math.round(hum*10)/10, Math.round(co2), Math.round(dust*100)/100, Math.round(noise), Math.round((1+Math.random()*3)*10)/10, Math.round((1010+Math.random()*20)*10)/10, status);
  });

  // Trace events seed
  const tr = db.prepare('INSERT INTO trace_events (id,miner_id,miner_name,event_type,zone,gallery,details,duration,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const types = ['entry','exit','zone_change','alert','rest','equipment','shift_start','shift_end'];
  const zones = ['ZONE A','ZONE B','ZONE C','ZONE D','ZONE E','ZONE F'];
  const gals = ['Galerie A1','Galerie B2','Galerie C1','Galerie D3','Galerie E2','Galerie F1'];
  const names = ['Amadou Diallo','Ibrahim Sow','Mamadou Keita','Ousmane Traoré','Cheikh Diop','Abdoulaye Ndiaye','Moussa Ba','Samba Fall'];
  const ids = ['MIN-001','MIN-002','MIN-003','MIN-004','MIN-005','MIN-006','MIN-007','MIN-008'];
  const now = Date.now();
  for (let i = 0; i < 40; i++) {
    const mi = Math.floor(Math.random()*ids.length);
    const zi = Math.floor(Math.random()*zones.length);
    const et = types[Math.floor(Math.random()*types.length)];
    const det = et==='alert'?'Chute détectée':et==='equipment'?'Contrat EPI vérifié':et==='rest'?'Pause déjeuner':null;
    const dur = ['rest','equipment'].includes(et)?Math.floor(Math.random()*60)+5:null;
    tr.run(`TR-${String(i+1).padStart(5,'0')}`, ids[mi], names[mi], et, zones[zi], gals[zi], det, dur, new Date(now-Math.floor(Math.random()*8*3600000)).toISOString());
  }
  console.log('✅ Base de données initialisée avec données de seed');
}
