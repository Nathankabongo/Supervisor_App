import { useState, useEffect } from 'react';
import {
  Gem,
  Clock,
  Weight,
  Mountain,
  BarChart3,
  Droplets,
  Flame,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wind,
  CloudRain,
  Eye,
} from 'lucide-react';
import { useWeather } from '../hooks/useWeather';

interface ExtractionData {
  id: string;
  mineral: string;
  mineralIcon: string;
  quantity: number;
  unit: string;
  todayQuantity: number;
  yesterdayQuantity: number;
  target: number;
  zone: string;
  gallery: string;
  quality: string;
  lastUpdate: string;
}

const mineralColors: Record<string, string> = {
  diamond: '#60a5fa',
  gold: '#fbbf24',
  iron: '#9ca3af',
  copper: '#f97316',
  bauxite: '#ef4444',
  phosphate: '#a78bfa',
  quartz: '#e2e8f0',
  lithium: '#22d3ee',
};

import apiService from '../services/api';

export default function Extraction() {
  const [extractions, setExtractions] = useState<ExtractionData[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedMineral, setSelectedMineral] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    apiService.getExtractions().then((res) => {
      if (res.extractions) setExtractions(res.extractions);
    }).catch(console.error);

    apiService.getTraceEvents({ eventType: 'alert', limit: 5 }).then((res) => {
       if (res.events) setEvents(res.events);
    }).catch(console.error);
  }, []);
  const {
    weather,
    isLoading: weatherLoading,
    description,
    airQuality,
    windDirection,
  } = useWeather();

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totalCarats = extractions.reduce((sum, e) => {
    if (e.unit === 'carats') return sum + e.todayQuantity;
    return sum;
  }, 0);

  const totalTons = extractions.reduce((sum, e) => {
    if (e.unit === 'tonnes') return sum + e.todayQuantity;
    return sum;
  }, 0);

  const totalKg = extractions.reduce((sum, e) => {
    if (e.unit === 'kg') return sum + e.todayQuantity;
    return sum;
  }, 0);

  const globalProgress = extractions.length > 0 ?
    extractions.reduce((sum, e) => sum + (e.todayQuantity / (e.target || 1)) * 100, 0) /
    extractions.length : 0;

  const getTrend = (today: number, yesterday: number) => {
    const diff = ((today - yesterday) / yesterday) * 100;
    return { value: Math.abs(diff).toFixed(1), isUp: diff >= 0 };
  };

  const getColor = (mineral: string) => {
    const key = mineral.toLowerCase();
    return mineralColors[key] || '#60a5fa';
  };



  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-lg border border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Mountain className="text-amber-500" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Exploitation Minière</h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar size={14} />
                <span className="capitalize">{today}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#0b1a2a] rounded-lg p-1 border border-gray-700">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded text-green-400 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Production active
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#1e293b] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Gem className="text-blue-400" size={20} />
            <span className="text-[10px] text-gray-400">Diamants</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalCarats} <span className="text-sm text-gray-400">carats</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={12} className="text-green-400" />
            <span className="text-xs text-green-400">+22.4%</span>
            <span className="text-[10px] text-gray-500">vs hier</span>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Weight className="text-amber-400" size={20} />
            <span className="text-[10px] text-gray-400">Métaux précieux</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalKg} <span className="text-sm text-gray-400">kg</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight size={12} className="text-green-400" />
            <span className="text-xs text-green-400">+14.3%</span>
            <span className="text-[10px] text-gray-500">vs hier</span>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Mountain className="text-gray-400" size={20} />
            <span className="text-[10px] text-gray-400">Minerais</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalTons} <span className="text-sm text-gray-400">tonnes</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowDownRight size={12} className="text-red-400" />
            <span className="text-xs text-red-400">-8.2%</span>
            <span className="text-[10px] text-gray-500">vs hier</span>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="text-green-400" size={20} />
            <span className="text-[10px] text-gray-400">Objectif global</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {globalProgress.toFixed(0)}
            <span className="text-sm text-gray-400">%</span>
          </p>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${globalProgress >= 80 ? 'bg-green-500' : globalProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(globalProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Extraction List */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">PRODUCTION DU JOUR PAR MINÉRAI</h2>
            </div>
            <div className="p-3 space-y-2">
              {extractions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Aucune donnée d'extraction disponible.
                </div>
              ) : extractions.map((extraction) => {
                const trend = getTrend(extraction.todayQuantity, extraction.yesterdayQuantity);
                const progress = (extraction.todayQuantity / extraction.target) * 100;
                const color = getColor(extraction.mineral);

                return (
                  <div
                    key={extraction.id}
                    onClick={() =>
                      setSelectedMineral(selectedMineral === extraction.id ? null : extraction.id)
                    }
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedMineral === extraction.id
                        ? 'bg-[#334155] border-green-500'
                        : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{extraction.mineralIcon}</span>
                        <div>
                          <h3 className="text-white font-semibold text-sm">{extraction.mineral}</h3>
                          <p className="text-[10px] text-gray-400">
                            {extraction.zone} • {extraction.gallery}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">
                          {extraction.todayQuantity}{' '}
                          <span className="text-xs text-gray-400">{extraction.unit}</span>
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          {trend.isUp ? (
                            <ArrowUpRight size={12} className="text-green-400" />
                          ) : (
                            <ArrowDownRight size={12} className="text-red-400" />
                          )}
                          <span
                            className={`text-xs ${trend.isUp ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {trend.isUp ? '+' : '-'}
                            {trend.value}%
                          </span>
                          <span className="text-[10px] text-gray-500">
                            vs hier ({extraction.yesterdayQuantity})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 min-w-[60px] text-right">
                        {extraction.todayQuantity}/{extraction.target} {extraction.unit}
                      </span>
                    </div>

                    {/* Expanded details */}
                    {selectedMineral === extraction.id && (
                      <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400">Qualité</p>
                          <p className="text-white font-medium">{extraction.quality}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Objectif</p>
                          <p className="text-white font-medium">
                            {extraction.target} {extraction.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Rendement</p>
                          <p
                            className={`font-medium ${progress >= 80 ? 'text-green-400' : progress >= 50 ? 'text-amber-400' : 'text-red-400'}`}
                          >
                            {progress.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Dernière MAJ</p>
                          <p className="text-white font-medium">
                            {new Date(extraction.lastUpdate).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">
                ÉVOLUTION HEBDOMADAIRE - DIAMANTS (CARATS)
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                 Historique indisponible (en attente de données)
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-3">
          {/* Zone Activity */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">ACTIVITÉ PAR ZONE</h2>
            </div>
            <div className="p-3 space-y-2">
              {['A', 'B', 'C', 'D', 'E', 'F'].map((zone) => {
                const zoneExtractions = extractions.filter((e) => e.zone === `ZONE ${zone}`);
                const zoneMiners = zoneExtractions.length;
                const isActive = zoneMiners > 0;
                return (
                  <div
                    key={zone}
                    className="flex items-center justify-between p-2 bg-[#0b1a2a] rounded border border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                      />
                      <span className="text-xs text-white font-medium">Zone {zone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {zoneExtractions.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {zoneExtractions.map((e) => e.mineralIcon).join(' ')}
                        </span>
                      )}
                      <span className={`text-xs ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Environmental Conditions - Météo temps réel */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">CONDITIONS ENVIRONNEMENTALES</h2>
              {weather && (
                <span className="text-[10px] text-gray-500">
                  Météo temps réel •{' '}
                  {new Date(weather.updatedAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className="p-3 space-y-3">
              {/* Météo principale */}
              {weatherLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 ml-2">Chargement météo...</span>
                </div>
              ) : weather ? (
                <>
                  {/* Condition météo */}
                  <div className="flex items-center justify-between p-2 bg-[#0b1a2a] rounded border border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{description?.icon}</span>
                      <span className={`text-xs font-medium ${description?.color}`}>
                        {description?.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">Surface</span>
                  </div>

                  {/* Température */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-orange-400" />
                      <span className="text-xs text-gray-300">Température</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white font-medium">
                        {weather.temperature}°C
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">
                        Ressenti {weather.apparentTemperature}°C
                      </span>
                    </div>
                  </div>

                  {/* Humidité */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-blue-400" />
                      <span className="text-xs text-gray-300">Humidité</span>
                    </div>
                    <span className="text-sm text-white font-medium">{weather.humidity}%</span>
                  </div>

                  {/* Vent */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind size={16} className="text-cyan-400" />
                      <span className="text-xs text-gray-300">Vent</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white font-medium">
                        {weather.windSpeed} km/h
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">{windDirection}</span>
                    </div>
                  </div>

                  {/* Précipitations */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CloudRain size={16} className="text-blue-500" />
                      <span className="text-xs text-gray-300">Précipitations</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {weather.precipitation} mm
                    </span>
                  </div>

                  {/* Pression */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-purple-400" />
                      <span className="text-xs text-gray-300">Pression</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {weather.pressure.toFixed(0)} hPa
                    </span>
                  </div>

                  {/* Couverture nuageuse */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" />
                      <span className="text-xs text-gray-300">Nuages</span>
                    </div>
                    <span className="text-sm text-white font-medium">{weather.cloudCover}%</span>
                  </div>

                  {/* Qualité air estimée */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" />
                      <span className="text-xs text-gray-300">Qualité air (estimée)</span>
                    </div>
                    <span className={`text-sm font-medium ${airQuality?.color}`}>
                      {airQuality?.label}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">Météo indisponible</div>
              )}

              {/* Données souterraines (fixes - spécifiques à la mine) */}
              <div className="border-t border-gray-700 pt-3 space-y-3">
                <p className="text-[10px] text-gray-500 font-medium">DONNÉES SOUTERRAINES</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mountain size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-300">Profondeur</span>
                  </div>
                  <span className="text-sm text-white font-medium">-120m</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-400" />
                    <span className="text-xs text-gray-300">Temp. souterraine</span>
                  </div>
                  <span className="text-sm text-white font-medium">28°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-green-400" />
                    <span className="text-xs text-gray-300">Heures de travail</span>
                  </div>
                  <span className="text-sm text-white font-medium">6h / 8h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-[#1e293b] rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">ÉVÉNEMENTS RÉCENTS</h2>
            </div>
            <div className="p-3 space-y-2">
              {events.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  Aucun événement récent.
                </div>
              ) : events.map((event, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 min-w-[35px]">
                    {new Date(event.createdAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                  </span>
                  <span className="text-amber-400">
                    {event.details || event.eventType} - {event.zone}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
