import { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Save, Plus, Trash2, MapPin, Info, Compass, ShieldAlert } from 'lucide-react';

interface GisZone {
  name: string;
  color: string;
  points: { lat: number; lng: number }[];
}

interface GisConfigData {
  site: {
    name: string;
    centerLat: number;
    centerLng: number;
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  zones: GisZone[];
}

export default function GisConfig() {
  const [config, setConfig] = useState<GisConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Zone sélectionnée pour l'édition et la visualisation
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number>(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonsGroupRef = useRef<L.LayerGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Charger la configuration depuis le backend au démarrage
  useEffect(() => {
    apiService.getGisConfig()
      .then((data: GisConfigData) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger la configuration GIS.");
        setLoading(false);
      });
  }, []);

  // Initialiser la carte Leaflet
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current || !config) return;

    // Créer la carte centrée sur le site
    const map = L.map(mapContainerRef.current, {
      center: [config.site.centerLat, config.site.centerLng],
      zoom: 15,
      zoomControl: true,
    });

    // Fond de carte satellite
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    mapRef.current = map;
    polygonsGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);

    // Style pour les tooltips des zones
    const style = document.createElement('style');
    style.innerHTML = `
      .gis-edit-tooltip {
        background: rgba(15, 23, 42, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #fff !important;
        font-weight: bold !important;
        font-size: 11px !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, config]);

  // Mettre à jour les polygones sur la carte à chaque modification des coordonnées ou de sélection
  useEffect(() => {
    if (!mapRef.current || !polygonsGroupRef.current || !markersGroupRef.current || !config) return;

    polygonsGroupRef.current.clearLayers();
    markersGroupRef.current.clearLayers();

    // 1. Dessiner les contours de la Bounding Box du site (en rouge pointillé)
    const bboxCoords = [
      [config.site.minLat, config.site.minLng],
      [config.site.minLat, config.site.maxLng],
      [config.site.maxLat, config.site.maxLng],
      [config.site.maxLat, config.site.minLng]
    ] as [number, number][];

    L.polygon(bboxCoords, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0,
      weight: 1.5,
      dashArray: '5, 8'
    })
    .bindTooltip("Limite du site (Bounding Box)", { permanent: true, direction: 'top', className: 'gis-edit-tooltip' })
    .addTo(polygonsGroupRef.current);

    // 2. Dessiner les zones
    config.zones.forEach((zone, idx) => {
      if (zone.points.length < 3) return;

      const isSelected = idx === selectedZoneIndex;
      const coords = zone.points.map(p => [p.lat, p.lng] as [number, number]);
      
      L.polygon(coords, {
        color: zone.color || '#94a3b8',
        fillColor: zone.color || '#94a3b8',
        fillOpacity: isSelected ? 0.35 : 0.15,
        weight: isSelected ? 3 : 1.5,
      })
      .bindTooltip(zone.name, { permanent: true, direction: 'center', className: 'gis-edit-tooltip' })
      .addTo(polygonsGroupRef.current!);

      // Si c'est la zone en cours d'édition, ajouter des marqueurs déplaçables pour chaque coin
      if (isSelected) {
        zone.points.forEach((point, pIdx) => {
          const marker = L.marker([point.lat, point.lng], {
            draggable: true,
            icon: L.divIcon({
              html: `<div style="width: 12px; height: 12px; border-radius: 50%; background: #ffffff; border: 2px solid ${zone.color}; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
              className: '',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          });

          // Événement dragend pour mettre à jour les coordonnées dans le state
          marker.on('dragend', (e) => {
            const newLatLng = (e.target as L.Marker).getLatLng();
            updatePointCoords(idx, pIdx, newLatLng.lat, newLatLng.lng);
          });

          marker.addTo(markersGroupRef.current!);
        });
      }
    });

    // Centrer la carte sur la zone sélectionnée
    const selZone = config.zones[selectedZoneIndex];
    if (selZone && selZone.points.length > 0) {
      const latSum = selZone.points.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = selZone.points.reduce((sum, p) => sum + p.lng, 0);
      const avgLat = latSum / selZone.points.length;
      const avgLng = lngSum / selZone.points.length;
      mapRef.current.panTo([avgLat, avgLng]);
    }

  }, [config, selectedZoneIndex]);

  // Mettre à jour les coordonnées d'un coin de polygone
  const updatePointCoords = (zoneIdx: number, pointIdx: number, lat: number, lng: number) => {
    if (!config) return;
    const updatedZones = [...config.zones];
    updatedZones[zoneIdx].points[pointIdx] = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };
    setConfig({ ...config, zones: updatedZones });
  };

  // Mettre à jour les infos du site
  const handleSiteChange = (field: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      site: {
        ...config.site,
        [field]: value
      }
    });
  };

  // Mettre à jour les infos d'une zone
  const handleZoneChange = (zoneIdx: number, field: string, value: any) => {
    if (!config) return;
    const updatedZones = [...config.zones];
    updatedZones[zoneIdx] = {
      ...updatedZones[zoneIdx],
      [field]: value
    };
    setConfig({ ...config, zones: updatedZones });
  };

  // Ajouter un point à la zone sélectionnée
  const handleAddPoint = (zoneIdx: number) => {
    if (!config) return;
    const updatedZones = [...config.zones];
    const points = updatedZones[zoneIdx].points;
    
    // Positionner le nouveau point à côté du dernier point
    const lastPoint = points[points.length - 1] || { lat: config.site.centerLat, lng: config.site.centerLng };
    const newPoint = {
      lat: Number((lastPoint.lat + 0.0005).toFixed(6)),
      lng: Number((lastPoint.lng + 0.0005).toFixed(6))
    };
    
    updatedZones[zoneIdx].points = [...points, newPoint];
    setConfig({ ...config, zones: updatedZones });
  };

  // Supprimer un point de la zone sélectionnée
  const handleRemovePoint = (zoneIdx: number, pointIdx: number) => {
    if (!config) return;
    const updatedZones = [...config.zones];
    updatedZones[zoneIdx].points = updatedZones[zoneIdx].points.filter((_, idx) => idx !== pointIdx);
    setConfig({ ...config, zones: updatedZones });
  };

  // Ajouter une nouvelle zone
  const handleCreateZone = () => {
    if (!config) return;
    const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#eab308'];
    const newZone: GisZone = {
      name: `NOUVELLE ZONE ${config.zones.length + 1}`,
      color: colors[config.zones.length % colors.length],
      points: [
        { lat: config.site.centerLat + 0.001, lng: config.site.centerLng - 0.001 },
        { lat: config.site.centerLat + 0.001, lng: config.site.centerLng + 0.001 },
        { lat: config.site.centerLat - 0.001, lng: config.site.centerLng + 0.001 },
        { lat: config.site.centerLat - 0.001, lng: config.site.centerLng - 0.001 }
      ]
    };
    const newZones = [...config.zones, newZone];
    setConfig({ ...config, zones: newZones });
    setSelectedZoneIndex(newZones.length - 1);
  };

  // Supprimer la zone sélectionnée
  const handleRemoveZone = (zoneIdx: number) => {
    if (!config) return;
    const updatedZones = config.zones.filter((_, idx) => idx !== zoneIdx);
    setConfig({ ...config, zones: updatedZones });
    setSelectedZoneIndex(Math.max(0, zoneIdx - 1));
  };

  // Soumettre la configuration au serveur backend
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    // Validation basique
    for (const zone of config.zones) {
      if (zone.points.length < 3) {
        setError(`La zone "${zone.name}" doit comporter au moins 3 points pour former un polygone.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    apiService.updateGisConfig(config)
      .then(() => {
        setSaving(false);
        setSuccessMsg("Configuration cartographique et zones enregistrées avec succès !");
        setTimeout(() => setSuccessMsg(null), 5000);
      })
      .catch((err) => {
        console.error(err);
        setError("Erreur lors de la sauvegarde de la configuration.");
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0b1a2a] text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Chargement de la configuration cartographique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b1a2a] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="text-green-500" size={24} />
            Gestion des Sites & Zones Métiers (GIS)
          </h1>
          <p className="text-xs text-gray-400">
            Configurer les coordonnées réelles du site minier et délimiter les polygones des zones métiers GPS.
          </p>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
        </button>
      </div>

      {/* Rendu principal */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Messages de retour */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <ShieldAlert size={18} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-950/80 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <Info size={18} className="text-green-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulaires d'édition à gauche (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Formulaire 1: Informations Générales du Site */}
            <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
                <Compass className="text-blue-400" size={16} />
                Configuration du Site Minier
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Nom du Site Minier</label>
                  <input
                    type="text"
                    value={config?.site.name || ''}
                    onChange={(e) => handleSiteChange('name', e.target.value)}
                    className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Latitude Centre</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={config?.site.centerLat || 0}
                      onChange={(e) => handleSiteChange('centerLat', Number(e.target.value))}
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Longitude Centre</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={config?.site.centerLng || 0}
                      onChange={(e) => handleSiteChange('centerLng', Number(e.target.value))}
                      className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="bg-[#0b1a2a] p-3 rounded-lg border border-gray-800 space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Limites Géographiques (Bounding Box)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Latitude Minimale</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={config?.site.minLat || 0}
                        onChange={(e) => handleSiteChange('minLat', Number(e.target.value))}
                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Latitude Maximale</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={config?.site.maxLat || 0}
                        onChange={(e) => handleSiteChange('maxLat', Number(e.target.value))}
                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Longitude Minimale</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={config?.site.minLng || 0}
                        onChange={(e) => handleSiteChange('minLng', Number(e.target.value))}
                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Longitude Maximale</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={config?.site.maxLng || 0}
                        onChange={(e) => handleSiteChange('maxLng', Number(e.target.value))}
                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire 2: Gestion des Zones Métiers */}
            <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="text-purple-400" size={16} />
                  Délimitation des Zones Métiers
                </h2>
                
                <button
                  type="button"
                  onClick={handleCreateZone}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Nouvelle Zone
                </button>
              </div>

              {/* Sélecteur de zone sous forme d'onglets horizontaux */}
              <div className="flex flex-wrap gap-1 bg-[#0b1a2a] p-1 rounded-lg border border-gray-800">
                {config?.zones.map((zone, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedZoneIndex(idx)}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      idx === selectedZoneIndex ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </button>
                ))}
              </div>

              {/* Formulaire d'édition de la zone sélectionnée */}
              {config && config.zones[selectedZoneIndex] && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Nom de la Zone</label>
                      <input
                        type="text"
                        value={config.zones[selectedZoneIndex].name}
                        onChange={(e) => handleZoneChange(selectedZoneIndex, 'name', e.target.value)}
                        className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Couleur de Surbrillance</label>
                      <input
                        type="color"
                        value={config.zones[selectedZoneIndex].color}
                        onChange={(e) => handleZoneChange(selectedZoneIndex, 'color', e.target.value)}
                        className="w-full h-8 bg-[#0b1a2a] border border-gray-700 rounded-lg px-1 py-1 cursor-pointer focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Liste des sommets du polygone de la zone */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Coordonnées des Sommets du Polygone
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPoint(selectedZoneIndex)}
                        className="text-green-400 hover:text-green-300 font-semibold text-[10px] flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Sommet
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {config.zones[selectedZoneIndex].points.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-500 w-4">{pIdx + 1}.</span>
                          <input
                            type="number"
                            step="0.000001"
                            placeholder="Lat"
                            value={point.lat}
                            onChange={(e) => updatePointCoords(selectedZoneIndex, pIdx, Number(e.target.value), point.lng)}
                            className="flex-1 bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                          />
                          <input
                            type="number"
                            step="0.000001"
                            placeholder="Lng"
                            value={point.lng}
                            onChange={(e) => updatePointCoords(selectedZoneIndex, pIdx, point.lat, Number(e.target.value))}
                            className="flex-1 bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-green-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePoint(selectedZoneIndex, pIdx)}
                            className="text-red-400 hover:text-red-300 shrink-0 p-1"
                            title="Supprimer ce sommet"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suppression de zone */}
                  <div className="pt-2 border-t border-gray-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(selectedZoneIndex)}
                      disabled={config.zones.length <= 1}
                      className="bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/60 font-semibold text-[10px] px-3 py-1.5 rounded transition-all disabled:opacity-50"
                    >
                      Supprimer la zone entière
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Carte interactive de prévisualisation à droite (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#1e293b] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  🗺️ Aperçu Satellite & Éditeur Interactif
                </span>
                <span className="text-[10px] text-gray-500">
                  Faites glisser les sommets blancs pour dessiner
                </span>
              </div>
              <div className="relative w-full h-[525px]">
                <div ref={mapContainerRef} className="w-full h-full absolute inset-0 bg-[#09111e]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
