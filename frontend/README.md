  <a name="readme-top"></a>

<br />
<div align="center">
  <a href="public/LOGO.png">
    <img src="public/LOGO.png" alt="Logo" width="80" height="80">
  </a>
  <h1>Supervisor App</h1>
  <p>Système de supervision et de traçabilité pour site minier</p>
</div>
<br />

## À propos du projet

**Supervisor App** est une application de supervision en temps réel pour sites miniers. Elle permet de suivre les mineurs en sous-sol, surveiller les conditions environnementales, communiquer via les montres T-Watch S3+, et assurer la traçabilité complète des déplacements.

### Fonctionnalités

- **Tableau de bord** — Vue d'ensemble du site minier avec carte interactive, positions des mineurs et conditions environnementales (température, humidité, CO₂, poussière, bruit, vent, pression)
- **Traçabilité** — Suivi en temps réel des entrées/sorties, changements de zone, alertes et événements de chaque mineur
- **Communication** — Envoi de messages texte et vocaux aux mineurs via T-Watch S3+ (diffusion générale, par zone ou individuelle)
- **Appareils LoRa** — Gestion des passerelles LoRa, scan et connexion des montres, mode simulateur intégré
- **Base de données SQLite** — Stockage persistant des utilisateurs, mineurs, messages, événements de traçabilité et conditions environnementales

### Technologies

- **Frontend** : React, TypeScript, TailwindCSS, Zustand, Socket.IO Client
- **Backend** : Express.js, Socket.IO, JWT, bcryptjs, better-sqlite3
- **Communication** : LoRa (simulateur + port série), WebSocket
- **Base de données** : SQLite (better-sqlite3)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Démarrage

### Prérequis

- [Node.js](https://nodejs.org/) v18+
- npm

### Installation

1. **Cloner le dépôt**
   ```sh
   git clone https://github.com/Nathankabongo/Supervisor_App.git
   cd Supervisor_App
   ```

2. **Installer les dépendances frontend**
   ```sh
   npm install
   ```

3. **Installer les dépendances backend**
   ```sh
   cd backend
   npm install
   ```

4. **Configurer l'environnement**
   ```sh
   cp backend/.env.example backend/.env
   ```
   Modifier `backend/.env` selon vos besoins (port, JWT secret, etc.)

5. **Lancer le backend** (port 5000)
   ```sh
   cd backend
   npm run dev
   ```

6. **Lancer le frontend** (port 3000)
   ```sh
   npm run dev
   ```

7. **Accéder à l'application** : http://localhost:3000

### Identifiants par défaut

| Utilisateur | Mot de passe | Rôle |
|---|---|---|
| `supervisor` | `admin123` | Superviseur |
| `admin` | `admin123` | Administrateur |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Structure du projet

```
Supervisor_App/
├── backend/
│   ├── routes/          # API routes (auth, data, lora)
│   ├── services/        # Services (database, loraSimulator, serialPort, websocket)
│   ├── data/            # SQLite database (auto-created)
│   └── .env             # Environment configuration
├── src/
│   ├── pages/           # Pages (Dashboard, Traceability, Communicate, Devices...)
│   ├── components/      # Composants (map, layout, alerts)
│   ├── services/        # API service, LoRa service
│   ├── store/           # Zustand state management
│   └── hooks/           # Custom hooks
├── firmware/            # T-Watch S3+ firmware
└── public/              # Assets statiques
```

## Licence

Distribué sous la licence MIT.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
