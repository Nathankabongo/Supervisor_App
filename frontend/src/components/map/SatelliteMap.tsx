import { useEffect, useRef, useState } from 'react';
import { Miner } from '../../store/useStore';
import apiService from '../../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SatelliteMapProps {
  miners: Miner[];
  selectedMiner: Miner | null;
  onMinerClick: (miner: Miner) => void;
}

// Bounding box mapping constants default (sera écrasé par la config GIS si disponible)
let minLng = 27.4700;
let maxLng = 27.4900;
let minLat = -11.6500;
let maxLat = -11.6400;

// Helper to convert SVG x/y back to lat/lng for fallbacks
const localToGps = (x: number, y: number) => {
  const lng = minLng + (x / 1000) * (maxLng - minLng);
  const lat = maxLat - (y / 500) * (maxLat - minLat);
  return { lat, lng };
};

export default function SatelliteMap({ miners, selectedMiner, onMinerClick }: SatelliteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonsGroupRef = useRef<L.LayerGroup | null>(null);
  const [gisConfig, setGisConfig] = useState<any>(null);

  // Charger la configuration GIS dynamique
  useEffect(() => {
    apiService.getGisConfig()
      .then((data) => {
        setGisConfig(data);
        if (data && data.site) {
          minLng = data.site.minLng;
          maxLng = data.site.maxLng;
          minLat = data.site.minLat;
          maxLat = data.site.maxLat;
        }
      })
      .catch((err) => {
        console.error("Erreur de chargement GIS dans SatelliteMap:", err);
      });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create leaflet map centered on Kolwezi site (ou centre dynamique)
    const map = L.map(mapContainerRef.current, {
      center: [-11.6458, 27.4794],
      zoom: 15,
      zoomControl: true,
    });

    // Load satellite layer (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    mapRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);
    polygonsGroupRef.current = L.layerGroup().addTo(map);

    // Add styles for tooltips
    const style = document.createElement('style');
    style.innerHTML = `
      .zone-tooltip {
        background: rgba(15, 23, 42, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 10px !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      }
      .miner-popup-custom {
        background: #1e293b !important;
        border: 1px solid #475569 !important;
        border-radius: 8px !important;
        padding: 4px !important;
      }
      .miner-popup-custom .leaflet-popup-content-wrapper {
        background: #1e293b !important;
        color: #f1f5f9 !important;
        border-radius: 8px !important;
      }
      .miner-popup-custom .leaflet-popup-tip {
        background: #1e293b !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Mettre à jour les polygones des zones une fois la configuration chargée
  useEffect(() => {
    if (!mapRef.current || !polygonsGroupRef.current) return;

    polygonsGroupRef.current.clearLayers();

    if (gisConfig && gisConfig.zones) {
      gisConfig.zones.forEach((zone: any) => {
        if (zone.points && zone.points.length >= 3) {
          const coords = zone.points.map((p: any) => [p.lat, p.lng] as [number, number]);
          const color = zone.color || '#94a3b8';
          
          L.polygon(coords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '3, 5'
          })
          .bindTooltip(zone.name, { permanent: true, direction: 'center', className: 'zone-tooltip' })
          .addTo(polygonsGroupRef.current!);
        }
      });

      // Centrer la carte sur le centre du site s'il est spécifié
      if (gisConfig.site) {
        mapRef.current.setView([gisConfig.site.centerLat, gisConfig.site.centerLng], mapRef.current.getZoom());
      }
    }
  }, [gisConfig]);

  // Update Markers & Pan
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear existing markers
    markersGroupRef.current.clearLayers();

    miners.forEach((miner) => {
      // Determine GPS position
      let lat = 0;
      let lng = 0;

      const fallback = localToGps(miner.position.x, miner.position.y);
      lat = fallback.lat;
      lng = fallback.lng;

      // Status color for the marker border
      const statusColor = 
        miner.status === 'danger' ? '#ef4444' : 
        miner.status === 'warning' ? '#f97316' : 
        '#22c55e';

      // Create a custom divIcon for a beautiful pulsating point
      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor}; z-index: 2; border: 2px solid #ffffff;"></div>
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: ${statusColor}; opacity: 0.4; transform: scale(1); animation: pulse-marker 1.8s infinite ease-in-out; z-index: 1;"></div>
            <div style="position: absolute; top: -16px; background: rgba(15, 23, 42, 0.9); color: #fff; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap; pointer-events: none; z-index: 3;">
              ${miner.name.split(' ')[0]}
            </div>
          </div>
          <style>
            @keyframes pulse-marker {
              0% { transform: scale(0.6); opacity: 0.9; }
              100% { transform: scale(1.6); opacity: 0; }
            }
          </style>
        `,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup content
      const popupContent = `
        <div style="font-family: inherit; font-size: 11px; min-width: 140px; padding: 2px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; border-bottom: 1px solid #475569; padding-bottom: 4px; color: #fff;">
            ${miner.name}
          </h4>
          <p style="margin: 2px 0;"><strong>Matricule:</strong> ${miner.matricule}</p>
          <p style="margin: 2px 0;"><strong>Zone:</strong> ${miner.currentZone}</p>
          <p style="margin: 2px 0;"><strong>Rôle:</strong> ${miner.role}</p>
          <p style="margin: 2px 0; display: flex; align-items: center; gap: 4px;">
            <strong>Santé:</strong> 
            <span style="color: ${miner.status === 'danger' ? '#f87171' : '#4ade80'}">
              ❤️ ${miner.heartRate} bpm
            </span>
          </p>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'miner-popup-custom' });

      // Click event
      marker.on('click', () => {
        onMinerClick(miner);
      });

      marker.addTo(markersGroupRef.current!);
    });

    // Pan to selected miner if present
    if (selectedMiner) {
      const pos = localToGps(selectedMiner.position.x, selectedMiner.position.y);
      mapRef.current.setView([pos.lat, pos.lng], 16, { animate: true });
    }

  }, [miners, selectedMiner, onMinerClick, gisConfig]);

  return (
    <div className="w-full h-full relative" style={{ height: '600px' }}>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 bg-[#09111e]" />
    </div>
  );
}
