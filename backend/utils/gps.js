// backend/utils/gps.js
import { getGisConfig } from './gisConfig.js';

let cachedConfig = null;

// Recharge la configuration à la demande (ex: après mise à jour via API)
export function reloadGisConfig() {
  cachedConfig = getGisConfig();
}

// Récupère la configuration en cache
export function getCachedGisConfig() {
  if (!cachedConfig) {
    reloadGisConfig();
  }
  return cachedConfig;
}

// Algorithme Ray-Casting pour valider la présence du point dans le polygone
export function isPointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p_i = polygon[i];
    const p_j = polygon[j];
    
    // Supporte le format tableau [lat, lng] ou objet {lat, lng}
    const xi = Array.isArray(p_i) ? p_i[0] : p_i.lat;
    const yi = Array.isArray(p_i) ? p_i[1] : p_i.lng;
    const xj = Array.isArray(p_j) ? p_j[0] : p_j.lat;
    const yj = Array.isArray(p_j) ? p_j[1] : p_j.lng;
    
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Convertit les coordonnées GPS réelles (lat, lng) en coordonnées locales SVG (1000x500)
export function gpsToLocalMap(lat, lng) {
  // Fallback si coordonnées invalides ou nulles
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return { x: 500, y: 250, zone: 'ZONE B' };
  }

  const config = getCachedGisConfig();
  const site = config ? config.site : {
    minLng: 27.4700,
    maxLng: 27.4900,
    minLat: -11.6500,
    maxLat: -11.6400
  };

  const minLngVal = site.minLng;
  const maxLngVal = site.maxLng;
  const minLatVal = site.minLat;
  const maxLatVal = site.maxLat;

  // Projection linéaire sur l'espace 1000x500 de la carte SVG
  let x = ((lng - minLngVal) / (maxLngVal - minLngVal)) * 1000;
  // Latitude inversée (nord en haut de la carte, SVG y = 0)
  let y = ((maxLatVal - lat) / (maxLatVal - minLatVal)) * 500;

  // Clamping pour rester dans les bornes SVG
  x = Math.max(10, Math.min(990, x));
  y = Math.max(10, Math.min(490, y));

  // Déterminer la zone réelle par appartenance au polygone
  let matchedZone = 'ZONE B'; // Par défaut
  
  if (config && config.zones && config.zones.length > 0) {
    for (const zone of config.zones) {
      if (isPointInPolygon(lat, lng, zone.points)) {
        matchedZone = zone.name;
        break;
      }
    }
  }

  return { x, y, zone: matchedZone };
}
