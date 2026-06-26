// backend/utils/gisConfig.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../data/gis_config.json');

// Assure que le dossier parent existe
const ensureDirExists = (filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

export function getGisConfig() {
  try {
    ensureDirExists(configPath);
    if (!fs.existsSync(configPath)) {
      // Configuration par défaut de secours
      return {
        site: {
          name: "Mine de Kolwezi",
          centerLat: -11.6458,
          centerLng: 27.4794,
          minLat: -11.6500,
          maxLat: -11.6400,
          minLng: 27.4700,
          maxLng: 27.4900
        },
        zones: []
      };
    }
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading GIS config:", error);
    return null;
  }
}

export function saveGisConfig(config) {
  try {
    ensureDirExists(configPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing GIS config:", error);
    return false;
  }
}
