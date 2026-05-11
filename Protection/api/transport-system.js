/**
 * API du Système de Transport Intelligent pour Smart Secure
 * Gère les véhicules, QR codes, géo-fencing et anti-vol
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const qr = require('qrcode');
const crypto = require('crypto');
const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());

// Base de données SQLite
const db = new sqlite3.Database('./transport.db');

// Initialisation de la base de données
function initializeDatabase() {
    // Table des véhicules
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chassis_number TEXT UNIQUE NOT NULL,
        plate_number TEXT UNIQUE NOT NULL,
        vehicle_type TEXT NOT NULL, -- bus, wewa, taxi
        driver_name TEXT NOT NULL,
        driver_license TEXT NOT NULL,
        driver_photo TEXT,
        qr_code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active', -- active, inactive, stolen
        current_lat REAL,
        current_lng REAL,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        route_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table des itinéraires
    db.run(`CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        waypoints TEXT, -- JSON array of coordinates
        geo_fence TEXT, -- JSON polygon for geo-fencing
        status TEXT DEFAULT 'active'
    )`);

    // Table des alertes
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        alert_type TEXT NOT NULL, -- theft, route_deviation, emergency
        message TEXT NOT NULL,
        lat REAL,
        lng REAL,
        resolved BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    )`);

    // Table des positions historiques
    db.run(`CREATE TABLE IF NOT EXISTS position_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        speed REAL,
        heading REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    )`);
}

class TransportSystem {
    constructor() {
        this.activePursuits = new Map();
        this.geoFenceAlerts = new Map();
    }

    /**
     * Génère un QR code unique pour un véhicule
     */
    async generateQRCode(vehicleData) {
        const qrData = {
            id: vehicleData.id,
            plate: vehicleData.plate_number,
            chassis: vehicleData.chassis_number,
            driver: vehicleData.driver_name,
            license: vehicleData.driver_license,
            timestamp: new Date().toISOString(),
            signature: crypto.createHash('sha256')
                .update(JSON.stringify(vehicleData))
                .digest('hex')
        };

        const qrString = JSON.stringify(qrData);
        const qrCodeImage = await qr.toDataURL(qrString);
        
        return {
            qrData: qrString,
            qrImage: qrCodeImage,
            signature: qrData.signature
        };
    }

    /**
     * Enregistre un nouveau véhicule
     */
    async registerVehicle(vehicleData) {
        return new Promise((resolve, reject) => {
            const qrCode = crypto.randomBytes(16).toString('hex');
            
            const stmt = db.prepare(`
                INSERT INTO vehicles 
                (chassis_number, plate_number, vehicle_type, driver_name, driver_license, driver_photo, qr_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run([
                vehicleData.chassis_number,
                vehicleData.plate_number,
                vehicleData.vehicle_type,
                vehicleData.driver_name,
                vehicleData.driver_license,
                vehicleData.driver_photo || null,
                qrCode
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        qr_code: qrCode,
                        message: 'Véhicule enregistré avec succès'
                    });
                }
            });

            stmt.finalize();
        });
    }

    /**
     * Met à jour la position d'un véhicule
     */
    async updateVehiclePosition(vehicleId, lat, lng, speed = null, heading = null) {
        return new Promise((resolve, reject) => {
            // Mettre à jour la position actuelle
            db.run(`
                UPDATE vehicles 
                SET current_lat = ?, current_lng = ?, last_update = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [lat, lng, vehicleId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Enregistrer dans l'historique
                db.run(`
                    INSERT INTO position_history (vehicle_id, lat, lng, speed, heading)
                    VALUES (?, ?, ?, ?, ?)
                `, [vehicleId, lat, lng, speed, heading], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        // Vérifier le geo-fencing
                        this.checkGeoFencing(vehicleId, lat, lng)
                            .then(alerts => resolve({
                                updated: true,
                                alerts: alerts
                            }))
                            .catch(reject);
                    }
                });
            });
        });
    }

    /**
     * Vérifie si le véhicule est dans sa zone autorisée (geo-fencing)
     */
    async checkGeoFencing(vehicleId, lat, lng) {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT v.*, r.geo_fence, r.name as route_name
                FROM vehicles v
                LEFT JOIN routes r ON v.route_id = r.id
                WHERE v.id = ?
            `, [vehicleId], async (err, vehicle) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!vehicle || !vehicle.geo_fence) {
                    resolve([]);
                    return;
                }

                const geoFence = JSON.parse(vehicle.geo_fence);
                const isInside = this.isPointInPolygon(lat, lng, geoFence);

                if (!isInside) {
                    // Créer une alerte de sortie de zone
                    const alert = await this.createAlert(vehicleId, 'route_deviation', 
                        `Le véhicule ${vehicle.plate_number} a quitté son itinéraire autorisé`, lat, lng);
                    
                    resolve([alert]);
                } else {
                    resolve([]);
                }
            });
        });
    }

    /**
     * Vérifie si un point est dans un polygone (algorithme de ray casting)
     */
    isPointInPolygon(lat, lng, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng, yi = polygon[i].lat;
            const xj = polygon[j].lng, yj = polygon[j].lat;
            
            const intersect = ((yi > lng) !== (yj > lng))
                && (xj < (lng - xi) * (yi - yj) / (yi - yj) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Crée une alerte
     */
    async createAlert(vehicleId, alertType, message, lat = null, lng = null) {
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO alerts (vehicle_id, alert_type, message, lat, lng)
                VALUES (?, ?, ?, ?, ?)
            `, [vehicleId, alertType, message, lat, lng], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        vehicle_id: vehicleId,
                        alert_type: alertType,
                        message: message,
                        created_at: new Date().toISOString()
                    });
                }
            });
        });
    }

    /**
     * Signale un vol et active la poursuite
     */
    async reportTheft(vehicleId, reporterInfo) {
        return new Promise((resolve, reject) => {
            // Marquer le véhicule comme volé
            db.run(`
                UPDATE vehicles SET status = 'stolen' WHERE id = ?
            `, [vehicleId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Créer une alerte de vol
                this.createAlert(vehicleId, 'theft', 
                    `VOL SIGNALÉ - ${reporterInfo.description}`, 
                    reporterInfo.lat, reporterInfo.lng)
                    .then(alert => {
                        // Activer la poursuite
                        this.activatePursuit(vehicleId);
                        resolve({
                            theft_reported: true,
                            alert_id: alert.id,
                            pursuit_active: true
                        });
                    })
                    .catch(reject);
            });
        });
    }

    /**
     * Active le mode poursuite pour un véhicule
     */
    activatePursuit(vehicleId) {
        this.activePursuits.set(vehicleId, {
            startTime: new Date(),
            lastPosition: null,
            policeNotified: false,
            engineShutdownAvailable: true
        });

        console.log(`🚨 POURSUITE ACTIVÉE pour le véhicule ${vehicleId}`);
    }

    /**
     * Coupe le moteur à distance (anti-vol)
     */
    async remoteEngineShutdown(vehicleId, authorizationCode) {
        // Vérification du code d'autorisation
        if (authorizationCode !== 'POLICE_SECURE_2026') {
            throw new Error('Code d\'autorisation invalide');
        }

        const pursuit = this.activePursuits.get(vehicleId);
        if (!pursuit || !pursuit.engineShutdownAvailable) {
            throw new Error('Poursuite non active ou coupure moteur non disponible');
        }

        // Simuler l'envoi de la commande de coupure moteur
        console.log(`🛑 COMMANDE DE COUPURE MOTEUR envoyée au véhicule ${vehicleId}`);
        
        pursuit.engineShutdownAvailable = false;
        pursuit.engineShutdownTime = new Date();

        return {
            success: true,
            message: 'Commande de coupure moteur envoyée avec succès',
            vehicleId: vehicleId,
            shutdownTime: pursuit.engineShutdownTime
        };
    }

    /**
     * Obtient tous les véhicules actifs avec leurs positions
     */
    async getActiveVehicles() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT id, plate_number, vehicle_type, driver_name, current_lat, current_lng, 
                       status, last_update, route_id
                FROM vehicles 
                WHERE status = 'active' AND current_lat IS NOT NULL
                ORDER BY last_update DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Obtient l'historique des positions d'un véhicule
     */
    async getVehicleHistory(vehicleId, hours = 24) {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT lat, lng, speed, heading, timestamp
                FROM position_history
                WHERE vehicle_id = ? AND timestamp >= datetime('now', '-${hours} hours')
                ORDER BY timestamp DESC
            `, [vehicleId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Vérifie un QR code de véhicule
     */
    async verifyQRCode(qrData) {
        try {
            const data = JSON.parse(qrData);
            
            return new Promise((resolve, reject) => {
                db.get(`
                    SELECT v.*, r.name as route_name
                    FROM vehicles v
                    LEFT JOIN routes r ON v.route_id = r.id
                    WHERE v.plate_number = ? AND v.chassis_number = ?
                `, [data.plate, data.chassis], (err, vehicle) => {
                    if (err) {
                        reject(err);
                    } else if (!vehicle) {
                        resolve({
                            valid: false,
                            message: 'Véhicule non trouvé'
                        });
                    } else {
                        resolve({
                            valid: true,
                            vehicle: vehicle,
                            qr_data: data,
                            verification_time: new Date().toISOString()
                        });
                    }
                });
            });
        } catch (error) {
            resolve({
                valid: false,
                message: 'QR code invalide'
            });
        }
    }
}

// Instance du système de transport
const transportSystem = new TransportSystem();

// Initialisation
initializeDatabase();

/**
 * API Endpoints
 */

// Enregistrement d'un véhicule
app.post('/api/vehicles/register', async (req, res) => {
    try {
        const result = await transportSystem.registerVehicle(req.body);
        
        // Générer le QR code
        const vehicleWithId = { ...req.body, id: result.id };
        const qrCode = await transportSystem.generateQRCode(vehicleWithId);
        
        res.json({
            success: true,
            vehicle: result,
            qr_code: qrCode
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mise à jour de position
app.post('/api/vehicles/:id/position', async (req, res) => {
    try {
        const { id } = req.params;
        const { lat, lng, speed, heading } = req.body;
        
        const result = await transportSystem.updateVehiclePosition(id, lat, lng, speed, heading);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Signalement de vol
app.post('/api/vehicles/:id/theft', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await transportSystem.reportTheft(id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Coupure moteur à distance
app.post('/api/vehicles/:id/shutdown', async (req, res) => {
    try {
        const { id } = req.params;
        const { authorizationCode } = req.body;
        
        const result = await transportSystem.remoteEngineShutdown(id, authorizationCode);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtenir les véhicules actifs
app.get('/api/vehicles/active', async (req, res) => {
    try {
        const vehicles = await transportSystem.getActiveVehicles();
        res.json({
            success: true,
            vehicles: vehicles,
            count: vehicles.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vérification QR code
app.post('/api/verify-qr', async (req, res) => {
    try {
        const { qr_data } = req.body;
        const result = await transportSystem.verifyQRCode(qr_data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Historique d'un véhicule
app.get('/api/vehicles/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { hours = 24 } = req.query;
        
        const history = await transportSystem.getVehicleHistory(id, parseInt(hours));
        res.json({
            success: true,
            vehicle_id: id,
            history: history,
            count: history.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistiques du système
app.get('/api/stats', (req, res) => {
    db.all(`
        SELECT 
            COUNT(*) as total_vehicles,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vehicles,
            COUNT(CASE WHEN status = 'stolen' THEN 1 END) as stolen_vehicles,
            COUNT(CASE WHEN vehicle_type = 'bus' THEN 1 END) as buses,
            COUNT(CASE WHEN vehicle_type = 'wewa' THEN 1 END) as wewas
        FROM vehicles
    `, (err, stats) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({
                success: true,
                statistics: stats[0],
                active_pursuits: transportSystem.activePursuits.size,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚌 Smart Secure Transport System API`);
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📊 Base de données initialisée`);
    console.log(`🔍 Endpoint santé: http://localhost:${PORT}/api/stats`);
});

module.exports = { transportSystem, app };
