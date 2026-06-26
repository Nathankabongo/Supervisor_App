/**
 * PROTOCOLE DE COMMUNICATION MONTRE LORA
 * 
 * La montre du mineur envoie des données via LoRa à la passerelle USB.
 * Format: JSON terminé par \n
 * 
 * TYPES DE MESSAGES:
 * 
 * 1. LOCALISATION (envoyé toutes les 5 secondes)
 *    {"type":"location","minerId":"MIN-001","x":165,"y":130,"zone":"ZONE A","battery":85,"rssi":-65}\n
 * 
 * 2. ALERTE (envoyé immédiatement lors d'un incident)
 *    {"type":"alert","minerId":"MIN-001","alertType":"fall","severity":"high","message":"Chute détectée"}\n
 *    {"type":"alert","minerId":"MIN-002","alertType":"immobility","severity":"medium","message":"Immobilité prolongée"}\n
 *    {"type":"alert","minerId":"MIN-003","alertType":"gas","severity":"high","message":"Gaz détecté"}\n
 *    {"type":"alert","minerId":"MIN-004","alertType":"emergency","severity":"high","message":"Bouton SOS activé"}\n
 * 
 * 3. STATUT (envoyé toutes les 30 secondes)
 *    {"type":"status","minerId":"MIN-001","status":"safe","heartRate":72,"temperature":36.5,"steps":1500}\n
 *    {"type":"status","minerId":"MIN-002","status":"warning","heartRate":110,"temperature":37.8,"steps":200}\n
 *    {"type":"status","minerId":"MIN-003","status":"danger","heartRate":45,"temperature":38.2,"steps":0}\n
 * 
 * 4. SANTÉ (envoyé toutes les 60 secondes)
 *    {"type":"health","minerId":"MIN-001","heartRate":72,"temperature":36.5,"oxygenLevel":98,"bloodPressure":"120/80"}\n
 * 
 * 5. ACK (accusé de réception de la montre)
 *    {"type":"ack","minerId":"MIN-001","commandId":"cmd-123","status":"ok"}\n
 * 
 * COMMANDES VERS LA MONTRE (depuis le superviseur):
 *    {"type":"command","targetId":"MIN-001","command":"evacuate","data":{"zone":"ZONE A"}}\n
 *    {"type":"command","targetId":"MIN-001","command":"heartbeat_request"}\n
 *    {"type":"command","targetId":"MIN-001","command":"alert_cancel","data":{"alertId":"alert-123"}}\n
 * 
 * CHAMPS:
 * - minerId: identifiant unique du mineur (format: MIN-XXX)
 * - x, y: coordonnées sur la carte (0-1000, 0-500)
 * - zone: zone actuelle (ZONE A à ZONE F)
 * - battery: niveau de batterie (0-100%)
 * - rssi: force du signal LoRa (dBm, négatif)
 * - alertType: fall | immobility | gas | emergency
 * - severity: low | medium | high
 * - status: safe | warning | danger
 * - heartRate: battements par minute
 * - temperature: température corporelle (°C)
 * - oxygenLevel: saturation en oxygène (%)
 * - steps: nombre de pas
 */

export const WATCH_PROTOCOL = {
  MESSAGE_TYPES: {
    LOCATION: 'location',
    ALERT: 'alert',
    STATUS: 'status',
    HEALTH: 'health',
    ACK: 'ack'
  },
  ALERT_TYPES: ['fall', 'immobility', 'gas', 'emergency'],
  SEVERITY_LEVELS: ['low', 'medium', 'high'],
  MINER_STATUSES: ['safe', 'warning', 'danger'],
  DELIMITER: '\n'
};
