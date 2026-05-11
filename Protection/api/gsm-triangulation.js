/**
 * API de Triangulation GSM pour le système Smart Secure
 * Permet la localisation hybride même lorsque le GPS est désactivé
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Base de données des antennes relais (simulation)
const cellTowers = [
    { id: 'tower_001', lat: -4.325, lng: 15.322, power: 20, range: 2000 },
    { id: 'tower_002', lat: -4.315, lng: 15.332, power: 25, range: 2500 },
    { id: 'tower_003', lat: -4.335, lng: 15.312, power: 18, range: 1800 },
    { id: 'tower_004', lat: -4.305, lng: 15.342, power: 22, range: 2200 },
    { id: 'tower_005', lat: -4.345, lng: 15.302, power: 20, range: 2000 }
];

// Base de données des appareils en tracking
const trackedDevices = new Map();

class GSMTriangulation {
    constructor() {
        this.towers = cellTowers;
    }

    /**
     * Calcule la distance entre deux points GPS
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Distance en mètres
    }

    toRad(deg) {
        return deg * (Math.PI/180);
    }

    /**
     * Calcule la force du signal basée sur la distance
     */
    calculateSignalStrength(distance, power) {
        // Formule simplifiée de path loss
        const pathLoss = 20 * Math.log10(distance) - 20 * Math.log10(2400) - 147.55;
        return power - pathLoss;
    }

    /**
     * Effectue la triangulation à partir des signaux reçus
     */
    triangulate(signals) {
        if (signals.length < 3) {
            throw new Error('Au moins 3 signaux sont nécessaires pour la triangulation');
        }

        // Pondération par la force du signal
        const weightedSignals = signals.map(signal => ({
            ...signal,
            weight: Math.abs(signal.signalStrength) / 100
        }));

        // Calcul de la position pondérée
        let totalLat = 0;
        let totalLng = 0;
        let totalWeight = 0;

        weightedSignals.forEach(signal => {
            const tower = this.towers.find(t => t.id === signal.towerId);
            if (tower) {
                totalLat += tower.lat * signal.weight;
                totalLng += tower.lng * signal.weight;
                totalWeight += signal.weight;
            }
        });

        const estimatedLat = totalLat / totalWeight;
        const estimatedLng = totalLng / totalWeight;

        // Calcul de la précision
        const accuracy = this.calculateAccuracy(signals, estimatedLat, estimatedLng);

        return {
            latitude: estimatedLat,
            longitude: estimatedLng,
            accuracy: accuracy,
            method: 'GSM_Triangulation',
            timestamp: new Date().toISOString(),
            towersUsed: signals.length
        };
    }

    /**
     * Calcule la précision de la localisation
     */
    calculateAccuracy(signals, lat, lng) {
        let maxDeviation = 0;
        
        signals.forEach(signal => {
            const tower = this.towers.find(t => t.id === signal.towerId);
            if (tower) {
                const expectedDistance = this.signalStrengthToDistance(signal.signalStrength, tower.power);
                const actualDistance = this.calculateDistance(tower.lat, tower.lng, lat, lng);
                const deviation = Math.abs(expectedDistance - actualDistance);
                maxDeviation = Math.max(maxDeviation, deviation);
            }
        });

        return Math.round(maxDeviation);
    }

    /**
     * Convertit la force du signal en distance estimée
     */
    signalStrengthToDistance(signalStrength, power) {
        const pathLoss = power - signalStrength;
        // Formule inversée simplifiée
        return Math.pow(10, (pathLoss + 147.55) / 20) / 2400;
    }
}

// Instance du système de triangulation
const gsmSystem = new GSMTriangulation();

/**
 * API Endpoints
 */

// Endpoint pour recevoir les données de signal d'un appareil
app.post('/api/tracking/signal', (req, res) => {
    try {
        const { deviceId, signals, emergencyMode } = req.body;

        if (!deviceId || !signals || !Array.isArray(signals)) {
            return res.status(400).json({ error: 'Paramètres invalides' });
        }

        // Stocker les informations de l'appareil
        trackedDevices.set(deviceId, {
            lastUpdate: new Date(),
            signals: signals,
            emergencyMode: emergencyMode || false
        });

        // Effectuer la triangulation
        const location = gsmSystem.triangulate(signals);

        // En mode urgence, activer le tracking intensif
        if (emergencyMode) {
            console.log(`MODE URGENCE ACTIVÉ pour l'appareil ${deviceId}`);
            // Ici on pourrait déclencher des alertes supplémentaires
        }

        res.json({
            success: true,
            location: location,
            deviceId: deviceId,
            emergencyMode: emergencyMode || false
        });

    } catch (error) {
        console.error('Erreur de triangulation:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour obtenir la position d'un appareil
app.get('/api/tracking/location/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const device = trackedDevices.get(deviceId);

    if (!device) {
        return res.status(404).json({ error: 'Appareil non trouvé' });
    }

    try {
        const location = gsmSystem.triangulate(device.signals);
        res.json({
            success: true,
            deviceId: deviceId,
            location: location,
            emergencyMode: device.emergencyMode,
            lastUpdate: device.lastUpdate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour activer le mode fantôme
app.post('/api/tracking/phantom-mode', (req, res) => {
    const { deviceId, activationCode } = req.body;

    // Vérification du code d'activation (sécurité)
    if (activationCode !== 'SMART_SECURE_2026') {
        return res.status(403).json({ error: 'Code d\'activation invalide' });
    }

    const device = trackedDevices.get(deviceId);
    if (device) {
        device.emergencyMode = true;
        device.phantomMode = true;
        device.phantomActivation = new Date();
        
        console.log(`MODE FANTÔME ACTIVÉ pour l'appareil ${deviceId}`);
        
        res.json({
            success: true,
            message: 'Mode fantôme activé avec succès',
            deviceId: deviceId
        });
    } else {
        res.status(404).json({ error: 'Appareil non trouvé' });
    }
});

// Endpoint pour l'analyse de proximité
app.post('/api/tracking/proximity-analysis', (req, res) => {
    const { targetDeviceId, radius = 100 } = req.body; // rayon en mètres
    const targetDevice = trackedDevices.get(targetDeviceId);

    if (!targetDevice) {
        return res.status(404).json({ error: 'Appareil cible non trouvé' });
    }

    try {
        const targetLocation = gsmSystem.triangulate(targetDevice.signals);
        const nearbyDevices = [];

        // Analyser tous les appareils trackés
        for (const [deviceId, device] of trackedDevices.entries()) {
            if (deviceId !== targetDeviceId) {
                const deviceLocation = gsmSystem.triangulate(device.signals);
                const distance = gsmSystem.calculateDistance(
                    targetLocation.latitude, targetLocation.longitude,
                    deviceLocation.latitude, deviceLocation.longitude
                );

                if (distance <= radius) {
                    nearbyDevices.push({
                        deviceId: deviceId,
                        distance: Math.round(distance),
                        speed: device.speed || 0,
                        direction: device.direction || 0,
                        suspicious: Math.abs(distance) < 50 // À moins de 50m = suspect
                    });
                }
            }
        }

        res.json({
            success: true,
            targetDevice: targetDeviceId,
            targetLocation: targetLocation,
            nearbyDevices: nearbyDevices,
            analysisRadius: radius,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint pour obtenir la liste des antennes disponibles
app.get('/api/towers', (req, res) => {
    res.json({
        success: true,
        towers: cellTowers.map(tower => ({
            id: tower.id,
            latitude: tower.lat,
            longitude: tower.lng,
            range: tower.range,
            status: 'active'
        }))
    });
});

// Endpoint de santé du système
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        trackedDevices: trackedDevices.size,
        towersAvailable: cellTowers.length,
        version: '1.0.0'
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🛡️  Smart Secure API - GSM Triangulation Server`);
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📍 Antennes disponibles: ${cellTowers.length}`);
    console.log(`📊 Endpoint santé: http://localhost:${PORT}/api/health`);
});

module.exports = { gsmSystem, app };
