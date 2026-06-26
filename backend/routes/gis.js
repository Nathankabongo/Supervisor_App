// backend/routes/gis.js
import express from 'express';
import { getGisConfig, saveGisConfig } from '../utils/gisConfig.js';

const router = express.Router();

// Récupérer la configuration GIS
router.get('/', (req, res) => {
  const config = getGisConfig();
  if (!config) {
    return res.status(500).json({ error: 'Impossible de charger la configuration GIS' });
  }
  res.json(config);
});

// Mettre à jour la configuration GIS
router.post('/', (req, res) => {
  const newConfig = req.body;
  if (!newConfig || !newConfig.site || !newConfig.zones) {
    return res.status(400).json({ error: 'Configuration GIS invalide' });
  }

  const success = saveGisConfig(newConfig);
  if (!success) {
    return res.status(500).json({ error: 'Impossible de sauvegarder la configuration GIS' });
  }

  res.json({ success: true, message: 'Configuration GIS mise à jour avec succès', config: newConfig });
});

export default router;
