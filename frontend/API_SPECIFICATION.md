# API Backend Specification - Mine Security Watch

## Configuration Serveur

- **Host:** `192.168.137.1`
- **Port:** `3000`
- **Protocol:** HTTP

---

## Endpoint: POST `/api/watch/data`

Envoi périodique des données capteurs (toutes les 30s).

### Headers
```
Content-Type: application/json
```

### Body JSON
```json
{
  "workerId": "M001",
  "battery": 85.5,
  "temperature": 36.2,
  "steps": 1234,
  "motion": "WALKING",
  "lat": -11.123456,
  "lng": 27.654321,
  "timestamp": "2026-01-01T12:34:56Z"
}
```

### Champs
| Champ | Type | Description |
|-------|------|-------------|
| `workerId` | string | ID du mineur (ex: "M001") |
| `battery` | float | Niveau batterie en % (0-100) |
| `temperature` | float | Température en °C |
| `steps` | int | Nombre de pas |
| `motion` | string | Type de mouvement (voir valeurs ci-dessous) |
| `lat` | float | Latitude GPS (0.0 si indisponible) |
| `lng` | float | Longitude GPS (0.0 si indisponible) |
| `timestamp` | string | Horodatage ISO 8601 |

### Valeurs possibles pour `motion`
- `"STILL"` - Immobile
- `"WALKING"` - Marche
- `"RUNNING"` - Course
- `"FALL"` - Chute détectée

### Réponse attendue
- Code HTTP `2xx` (200, 201, etc.) pour succès

---

## Endpoint: POST `/api/watch/sos`

Envoi d'alertes d'urgence (SOS ou chute).

### Headers
```
Content-Type: application/json
```

### Body JSON - Alertes SOS
```json
{
  "workerId": "M001",
  "type": "SOS",
  "battery": 85.5,
  "lat": -11.123456,
  "lng": 27.654321,
  "timestamp": "2026-01-01T12:34:56Z"
}
```

### Body JSON - Alertes Chute
```json
{
  "workerId": "M001",
  "type": "FALL",
  "battery": 85.5,
  "lat": -11.123456,
  "lng": 27.654321,
  "timestamp": "2026-01-01T12:34:56Z"
}
```

### Champs
| Champ | Type | Description |
|-------|------|-------------|
| `workerId` | string | ID du mineur |
| `type` | string | Type d'alerte: "SOS" ou "FALL" |
| `battery` | float | Niveau batterie en % |
| `lat` | float | Latitude GPS |
| `lng` | float | Longitude GPS |
| `timestamp` | string | Horodatage ISO 8601 |

### Réponse attendue
- Code HTTP `2xx` pour succès

---

## Exemple d'implémentation (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint données capteurs
app.post('/api/watch/data', (req, res) => {
  const { workerId, battery, temperature, steps, motion, lat, lng, timestamp } = req.body;
  
  console.log(`[${timestamp}] Worker ${workerId}: ${motion}, Battery ${battery}%`);
  
  // Stocker en base de données ou traiter
  // ...
  
  res.status(200).json({ success: true });
});

// Endpoint alertes SOS/Chute
app.post('/api/watch/sos', (req, res) => {
  const { workerId, type, battery, lat, lng, timestamp } = req.body;
  
  console.log(`🚨 ALERT ${type} from ${workerId} at ${timestamp}`);
  console.log(`   Location: ${lat}, ${lng}`);
  
  // Déclencher notification, stocker urgence, etc.
  // ...
  
  res.status(200).json({ success: true });
});

app.listen(3000, '192.168.137.1', () => {
  console.log('Server running on http://192.168.137.1:3000');
});
```

---

## Dépannage

### Erreur HTTP -1
Cette erreur indique que le serveur n'est pas joignable. Vérifiez:

1. **Adresse IP:** Le serveur doit écouter sur `192.168.137.1` (pas `localhost` ou `127.0.0.1`)
2. **Port:** Le port 3000 doit être ouvert et libre
3. **Firewall:** Autoriser les connexions entrantes sur le port 3000
4. **Réseau:** L'ESP32 et le serveur doivent être sur le même réseau `192.168.137.x`
5. **Serveur actif:** Vérifiez que le serveur backend est bien démarré

### Test avec curl
```bash
curl -X POST http://192.168.137.1:3000/api/watch/data \
  -H "Content-Type: application/json" \
  -d '{"workerId":"M001","battery":85.5,"temperature":36.2,"steps":1234,"motion":"WALKING","lat":-11.123456,"lng":27.654321,"timestamp":"2026-01-01T12:34:56Z"}'
```
