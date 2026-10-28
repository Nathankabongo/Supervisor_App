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
export function gpsToLocalMap(rawLat, rawLng) {
  const lat = Number(rawLat);
  const lng = Number(rawLng);

  // Fallback si coordonnées invalides, nulles ou 0,0 (perte fix GPS)
  if (!rawLat || !rawLng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return { x: 500, y: 250, zone: 'ZONE B', validGps: false, lat: 0, lng: 0 };
  }

  const config = getCachedGisConfig();
  let site = config?.site;

  // Si pas de site configuré, utiliser un cadre centré sur le point
  if (!site || !site.minLat || !site.maxLat || !site.minLng || !site.maxLng) {
    site = {
      minLng: lng - 0.01,
      maxLng: lng + 0.01,
      minLat: lat - 0.005,
      maxLat: lat + 0.005
    };
  }

  // Détection si les coordonnées GPS réelles sont très éloignées (> 15 km) du site configuré
  const siteCenterLat = (site.minLat + site.maxLat) / 2;
  const siteCenterLng = (site.minLng + site.maxLng) / 2;
  const isFar = Math.abs(lat - siteCenterLat) > 0.15 || Math.abs(lng - siteCenterLng) > 0.15;

  let minLngVal = site.minLng;
  let maxLngVal = site.maxLng;
  let minLatVal = site.minLat;
  let maxLatVal = site.maxLat;

  if (isFar) {
    // Adapter dynamiquement le viewport local autour de la position GPS réelle de la montre
    const deltaLat = 0.005; // ~550m
    const deltaLng = 0.010; // ~1.1km
    minLatVal = lat - deltaLat;
    maxLatVal = lat + deltaLat;
    minLngVal = lng - deltaLng;
    maxLngVal = lng + deltaLng;
  }

  // Projection linéaire sur l'espace 1000x500 de la carte SVG
  const lngSpan = (maxLngVal - minLngVal) || 0.001;
  const latSpan = (maxLatVal - minLatVal) || 0.001;

  let x = ((lng - minLngVal) / lngSpan) * 1000;
  // Latitude inversée (nord en haut de la carte, SVG y = 0)
  let y = ((maxLatVal - lat) / latSpan) * 500;

  // Clamping pour rester dans les bornes SVG avec marge visuelle
  x = Math.max(20, Math.min(980, x));
  y = Math.max(20, Math.min(480, y));

  // Déterminer la zone réelle par appartenance au polygone
  let matchedZone = 'ZONE B'; // Par défaut
  
  if (config && config.zones && config.zones.length > 0) {
    for (const zone of config.zones) {
      if (isPointInPolygon(lat, lng, zone.points)) {
        matchedZone = zone.name;
        break;
      }
    }
  } else {
    // Si pas de polygones configurés, découpage par quadrant de carte
    if (y < 250) {
      if (x < 333) matchedZone = 'ZONE A';
      else if (x < 666) matchedZone = 'ZONE B';
      else matchedZone = 'ZONE C';
    } else {
      if (x < 333) matchedZone = 'ZONE D';
      else if (x < 666) matchedZone = 'ZONE E';
      else matchedZone = 'ZONE F';
    }
  }

  return { 
    x: Math.round(x * 10) / 10, 
    y: Math.round(y * 10) / 10, 
    zone: matchedZone, 
    validGps: true, 
    lat, 
    lng 
  };
}
