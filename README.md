# Supervisor App

Application full-stack de **supervision minière et HSE** : suivi des travailleurs en temps réel, alertes SOS / chute via montres connectées (WiFi / LoRa), localisation et procédures d’urgence.

## Fonctionnalités principales

- **Tableau de bord** — vue d’ensemble du site et des équipes
- **Localisation** — page unifiée avec onglets :
  - Carte live
  - Trajectoires GPS
  - Traçabilité des événements
  - Urgence (vue 3D / évacuation, activée sur SOS ou chute réelle)
- **Alertes** — uniquement depuis l’API montre réelle (pas de simulation)
- **Mineurs & HSE** — fiches, zones, communication
- **Montres / LoRa** — réception des données et alertes (HTTP WiFi + port série optionnel)
- **Temps réel** — mises à jour via Socket.IO
- Modules complémentaires (flotte, maintenance, géotech, énergie, crise, etc.) selon la navigation

## Stack technique

| Couche | Technologies |
|--------|----------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, MUI, Zustand, Socket.IO Client, Leaflet |
| Backend | Node.js, Express, Socket.IO, JWT, better-sqlite3, serialport |
| Données | SQLite (`backend/data/supervisor.db`) |

## Structure du repo

```
Supervisor_App/
├── package.json          # Scripts racine (dev, install:all)
├── .env.example          # Modèle de configuration
├── frontend/             # App React (Vite, port 3000)
│   └── src/
│       ├── pages/        # Écrans (Dashboard, Localisation, Alerts…)
│       ├── components/   # UI (carte, localisation, layout…)
│       ├── services/     # Client API
│       ├── store/        # État Zustand
│       └── hooks/        # WebSocket / temps réel
└── backend/              # API Express (port 5000)
    ├── server.js
    ├── routes/           # auth, watch, data, lora, …
    ├── services/         # DB, WebSocket, série LoRa, temps réel
    └── data/             # Base SQLite
```

## Prérequis

- **Node.js 18+** (recommandé : Node 20)
- npm

Sur cet environnement, les scripts racine préfèrent Node installé dans `~/.local/node/bin` s’il est présent (`PATH` préfixé automatiquement).

## Installation

```bash
cd Supervisor_App
npm install
npm run install:all
```

`install:all` installe les dépendances `backend` et `frontend`, puis reconstruit `better-sqlite3` si besoin.

## Configuration

1. Copier le modèle d’environnement :

```bash
cp .env.example backend/.env
cp .env.example frontend/.env
```

2. Ajuster au minimum :

**`backend/.env`**

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `5000` | Port API |
| `JWT_SECRET` | *(à changer)* | Signature des tokens |
| `FRONTEND_URL` | `http://localhost:3000` | CORS |
| `DB_PATH` | `./data/supervisor.db` | Fichier SQLite |
| `LORA_PORT` | `COM3` | Port série LoRa (optionnel) |
| `BAUD_RATE` | `9600` | Débit série |

**`frontend/.env`** (préfixe `VITE_` requis)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `VITE_API_URL` | `http://localhost:5000/api` | URL API |
| `VITE_SOCKET_URL` | `http://localhost:5000` | WebSocket |

En développement local, le proxy Vite (`/api`, `/socket.io` → `:5000`) permet aussi d’utiliser des URLs relatives.

## Lancer l’application

Depuis la racine :

```bash
npm run dev
```

Cela démarre backend et frontend en parallèle.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend / API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

Scripts séparés : `npm run dev:backend`, `npm run dev:frontend`.

## Compte démo

Créés automatiquement au premier démarrage (si la table `users` est vide) :

| Utilisateur | Mot de passe | Rôle |
|-------------|--------------|------|
| `admin` | `admin123` | Administrateur |
| `supervisor` | `admin123` | Superviseur |

## API montre / SOS

Les montres (ex. T-Watch) envoient les données en HTTP vers le backend.

**Alerte SOS ou chute**

```http
POST /api/watch/sos
Content-Type: application/json
```

```json
{
  "workerId": "M001",
  "type": "SOS",
  "lat": -4.325,
  "lng": 15.312,
  "battery": 75
}
```

- `workerId` : matricule du mineur (ex. `M001`)
- `type` : `"SOS"` (urgence) ou `"FALL"` (chute)
- Capteurs optionnels : `heartRate`, `seismicHz`, etc.

Données périodiques : `POST /api/watch/data` (position, batterie, etc.).

## Notes

- **LoRa série** : `LORA_PORT=COM3` convient surtout à Windows. Sous Linux, utiliser un périphérique du type `/dev/ttyUSB0` ou `/dev/ttyACM0` si une gateway est branchée. Sans matériel, le serveur démarre quand même (avertissement port série).
- **Alertes** : elles proviennent des montres réelles (API watch / LoRa), pas d’un simulateur d’alertes.
- Ne pas committer les fichiers `.env` ni la base SQLite locale si elle contient des données sensibles.
