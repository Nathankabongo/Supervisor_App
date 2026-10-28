import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Filter,
  Trash2,
  Watch,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function Alerts() {
  const { alerts, setAlerts, resolveAlert, deleteAlert, clearAlerts, miners, setSelectedMiner } =
    useStore();
  const navigate = useNavigate();

  const locateMiner = (minerId: string | null | undefined, alertType: string, resolved: boolean) => {
    if (!minerId) return;
    const miner = miners.find((m) => m.id === minerId);
    if (!miner) return;
    setSelectedMiner(miner);
    const isWatchUrgency =
      !resolved && (alertType === 'emergency' || alertType === 'fall');
    navigate(isWatchUrgency ? '/localisation?tab=evacuation' : '/localisation?tab=carte');
  };

  const handleDeleteSingleAlert = async (alertId: string) => {
    try {
      await apiService.deleteAlert(alertId);
      deleteAlert(alertId);
    } catch (err) {
      console.error('Erreur suppression alerte:', err);
    }
  };
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [loading, setLoading] = useState(false);

  // Miners having a connected/assigned watch
  const minersWithWatch = new Set(
    miners.filter((m) => m.watchId || (m as any).watch_id).map((m) => m.id)
  );

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAlerts(connectedOnly);
      if (res.alerts) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.error('Erreur chargement alertes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [connectedOnly]);

  const handleClearAll = async () => {
    if (confirm('Voulez-vous supprimer toutes les alertes enregistrées ?')) {
      try {
        await apiService.clearAlerts();
        clearAlerts();
      } catch (err) {
        console.error('Erreur suppression alertes:', err);
      }
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (connectedOnly) {
      // Filter out alerts if the miner does not have an assigned watch
      const hasWatch = (a.minerId ? minersWithWatch.has(a.minerId) : false) || miners.length === 0;
      if (!hasWatch) return false;
    }
    if (filterStatus === 'unresolved') return !a.resolved;
    if (filterStatus === 'resolved') return a.resolved;
    return true;
  });

  const unresolvedAlerts = filteredAlerts.filter((a) => !a.resolved);
  const resolvedAlerts = filteredAlerts.filter((a) => a.resolved);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-accent-red bg-red-900/20 border-accent-red';
      case 'medium':
        return 'text-accent-orange bg-orange-900/20 border-accent-orange';
      case 'low':
        return 'text-yellow-500 bg-yellow-900/20 border-yellow-500';
      default:
        return 'text-accent-red bg-red-900/20 border-accent-red';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'fall':
        return 'Chute détectée';
      case 'immobility':
        return 'Immobilité détectée';
      case 'gas':
        return 'Niveau de gaz élevé';
      case 'emergency':
        return 'Urgence SOS';
      default:
        return 'Alerte Montre';
    }
  };

  const AlertCard = ({ alert, isResolved }: { alert: (typeof alerts)[0]; isResolved: boolean }) => {
    const miner = miners.find((m) => m.id === alert.minerId);
    const watchId = miner?.watchId || (miner as any)?.watch_id;

    return (
      <div className={`bg-card rounded-lg p-4 border ${getSeverityColor(alert.severity)}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={20}
              className={alert.severity === 'high' ? 'text-accent-red' : 'text-accent-orange'}
            />
            <h3 className="text-white font-semibold">{getAlertTypeText(alert.type)}</h3>
          </div>
          {isResolved ? (
            <CheckCircle size={20} className="text-accent-green" />
          ) : (
            watchId && (
              <span className="flex items-center gap-1 text-[10px] bg-sky-500/20 border border-sky-500/30 text-sky-400 px-2 py-0.5 rounded-full font-mono">
                <Watch size={12} /> {watchId}
              </span>
            )
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-300 font-medium">{alert.minerName || 'Incident de zone'}</span>
            </div>
            {watchId && (
              <span className="text-xs text-gray-400 font-mono">Montre: {watchId}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-300">{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
          </div>

          {alert.zone && (
            <div className="flex items-center gap-2 text-sm text-cyan-300/90">
              <MapPin size={16} className="text-cyan-400" />
              <span>
                Zone : <strong className="text-white">{alert.zone}</strong>
              </span>
            </div>
          )}

          {alert.predictedCause && (
            <div className="text-xs text-amber-300/90 bg-amber-950/40 p-2 rounded border border-amber-800/30">
              <span className="font-semibold">Cause détectée:</span> {alert.predictedCause}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Sévérité:</span>
            <span
              className={`font-medium ${
                alert.severity === 'high'
                  ? 'text-accent-red'
                  : alert.severity === 'medium'
                    ? 'text-accent-orange'
                    : 'text-yellow-500'
              }`}
            >
              {alert.severity === 'high'
                ? 'Élevée'
                : alert.severity === 'medium'
                  ? 'Moyenne'
                  : 'Faible'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {miner && (
            <button
              onClick={() => locateMiner(alert.minerId, alert.type, alert.resolved)}
              className="w-full flex items-center justify-center gap-1.5 bg-cyan-900/40 hover:bg-cyan-800/50 border border-cyan-700/40 text-cyan-200 py-2 rounded-lg text-xs font-medium transition-colors"
              title={
                !alert.resolved && (alert.type === 'emergency' || alert.type === 'fall')
                  ? 'Ouvrir la vue urgence (alerte montre)'
                  : 'Ouvrir la localisation'
              }
            >
              <MapPin size={14} />
              {!alert.resolved && (alert.type === 'emergency' || alert.type === 'fall')
                ? 'Localiser (Urgence)'
                : 'Localiser'}
            </button>
          )}
          <div className="flex items-center gap-2">
            {!isResolved && (
              <button
                onClick={() => {
                  apiService
                    .resolveAlert(alert.id)
                    .then(() => resolveAlert(alert.id))
                    .catch(console.error);
                }}
                className="flex-1 bg-accent-green hover:bg-green-600 text-white py-2 rounded-lg text-xs font-medium transition-colors"
              >
                Marquer résolu
              </button>
            )}
            <button
              onClick={() => handleDeleteSingleAlert(alert.id)}
              className="flex items-center gap-1 px-3 py-2 bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-colors shrink-0"
              title="Supprimer cette alerte"
            >
              <Trash2 size={14} />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-white">Alertes Sécurité</h1>
            <p className="text-xs text-gray-400">Alertes provenant des montres connectées</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Connected Watches Only */}
          <button
            onClick={() => setConnectedOnly(!connectedOnly)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              connectedOnly
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                : 'bg-card border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Watch size={16} />
            <span>{connectedOnly ? 'Montres connectées uniquement' : 'Toutes les alertes'}</span>
          </button>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="all">Toutes les alertes</option>
              <option value="unresolved">Non résolues</option>
              <option value="resolved">Résolues</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-2 bg-card border border-gray-700 hover:bg-slate-800 text-gray-300 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Purge / Clear all */}
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-colors"
            title="Purger toutes les alertes de test"
          >
            <Trash2 size={16} />
            <span>Effacer l'historique</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border border-gray-700">
          <p className="text-3xl font-bold text-accent-red">{unresolvedAlerts.length}</p>
          <p className="text-sm text-gray-400">Alertes actives</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-gray-700">
          <p className="text-3xl font-bold text-accent-green">{resolvedAlerts.length}</p>
          <p className="text-sm text-gray-400">Alertes résolues</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-gray-700">
          <p className="text-3xl font-bold text-white">{filteredAlerts.length}</p>
          <p className="text-sm text-gray-400">Total alertes {connectedOnly ? '(Montres)' : ''}</p>
        </div>
      </div>

      {/* Unresolved Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Alertes non résolues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unresolvedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} isResolved={false} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Alertes résolues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resolvedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} isResolved={true} />
            ))}
          </div>
        </div>
      )}

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 bg-card/40 rounded-xl border border-dashed border-gray-800">
          <AlertTriangle size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Aucune alerte à afficher</p>
          <p className="text-xs text-gray-500 mt-1">
            Les nouvelles alertes s'afficheront automatiquement en temps réel lorsqu'une montre connectée déclenchera un signal.
          </p>
        </div>
      )}
    </div>
  );
}

