import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import loraRoutes, { setLoraReferences } from './routes/lora.js';
import dataRoutes, { initTraceData, setDataReferences } from './routes/data.js';
import watchRoutes, { setWatchReferences } from './routes/watch.js';
import gisRoutes from './routes/gis.js';
import { getDb } from './services/database.js';
import { SerialPortManager } from './services/serialPort.js';
import { WebSocketManager } from './services/websocket.js';
import { RealTimeDataService } from './services/realTimeDataService.js';

dotenv.config({ path: '.env' });

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET est requis dans les variables d\'environnement');
  }
  return secret;
};

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Autoriser les connexions sans origine (comme les appareils physiques)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed)) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/.test(origin);
        
      if (isAllowed) {
        callback(null, true);
      } else {
        // En mode développement, on autorise dynamiquement avec un avertissement
        callback(null, true);
        console.warn(`[CORS Warning] Connexion autorisée dynamiquement depuis l'origine non répertoriée : ${origin}`);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting simple (sans dépendance externe)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 min
const MAX_LOGIN_ATTEMPTS = 5;

const rateLimiter = (req, res, next) => {
  if (req.path !== '/api/auth/login') return next();
  
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, startTime: now };
  
  if (now - attempts.startTime > RATE_LIMIT_WINDOW) {
    attempts.count = 0;
    attempts.startTime = now;
  }
  
  attempts.count++;
  loginAttempts.set(ip, attempts);
  
  if (attempts.count > MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }
  
  next();
};

app.use(rateLimiter);

// Initialize database
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lora', loraRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/watch', watchRoutes);
app.use('/api/gis', gisRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend en cours d\'exécution' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Initialize services avec injection de dépendances
const websocketManager = new WebSocketManager(io);
const realTimeDataService = new RealTimeDataService(websocketManager);

websocketManager.setRealTimeDataService(realTimeDataService);
setDataReferences(websocketManager, realTimeDataService);
setWatchReferences(realTimeDataService);

// SerialPort utilise un callback au lieu de globals
const serialPortManager = new SerialPortManager((data) => {
  io.emit('watch-raw-data', { endpoint: 'LoRa Serial (COM3)', payload: data });
  realTimeDataService.processLoRaData(data);
});

// Injecter les références dans les routes LoRa
setLoraReferences(serialPortManager, realTimeDataService);

// Initialiser les données de traçabilité
initTraceData();



// Authentification WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  
  // Permettre connexion sans token en développement
  if (!token && process.env.NODE_ENV !== 'production') {
    console.warn('Connexion WebSocket sans token (mode développement)');
    return next();
  }
  
  if (!token) {
    return next(new Error('Authentification requise'));
  }
  
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
});

// Handle WebSocket connection
io.on('connection', (socket) => {
  const user = socket.user || { username: 'anonymous' };
  console.log('Client connecté:', socket.id, `(${user.username})`);
  websocketManager.handleConnection(socket);
});

// Arrêt gracieux
const gracefulShutdown = (signal) => {
  console.log(`\nSignal ${signal} reçu. Arrêt en cours...`);
  
  // Fermer les connexions WebSocket
  io.disconnectSockets(true);
  console.log('Connexions WebSocket fermées');
  
  // Arrêter le port série
  serialPortManager.stop();
  console.log('Port série fermé');
  

  
  // Arrêter le service de données
  realTimeDataService.stop();
  console.log('Service de données arrêté');
  
  // Fermer le serveur HTTP
  httpServer.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
  
  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    console.error('Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Serveur backend en cours d'exécution sur le port ${PORT}`);
  console.log('Serveur WebSocket prêt');
  
  // Démarrer la connexion série LoRa
  serialPortManager.start().catch(err => {
    console.warn('Port série non disponible:', err.message);
  });
  console.log('Mode réel: en attente des montres LoRa sur le port série');
});

export { io, serialPortManager, websocketManager, realTimeDataService };
