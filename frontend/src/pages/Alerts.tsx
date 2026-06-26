import { useStore } from '../store/useStore';
import { AlertTriangle, CheckCircle, Clock, User, Filter } from 'lucide-react';
import apiService from '../services/api';

export default function Alerts() {
  const { alerts, resolveAlert } = useStore();
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

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
        return 'Urgence';
      default:
        return 'Alerte';
    }
  };

  const AlertCard = ({ alert, isResolved }: { alert: (typeof alerts)[0]; isResolved: boolean }) => (
    <div className={`bg-card rounded-lg p-4 border ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={20}
            className={alert.severity === 'high' ? 'text-accent-red' : 'text-accent-orange'}
          />
          <h3 className="text-white font-semibold">{getAlertTypeText(alert.type)}</h3>
        </div>
        {isResolved && <CheckCircle size={20} className="text-accent-green" />}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <User size={16} className="text-gray-400" />
          <span className="text-gray-300">{alert.minerName}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-gray-300">{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
        </div>

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

      {!isResolved && (
        <button
          onClick={() => {
            apiService.resolveAlert(alert.id).then(() => {
              resolveAlert(alert.id);
            }).catch(console.error);
          }}
          className="w-full bg-accent-green text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          Marquer comme résolu
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-white">Alertes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select className="bg-card border border-gray-700 rounded-lg px-3 py-2 text-white">
            <option>Toutes les alertes</option>
            <option>Non résolues</option>
            <option>Résolues</option>
          </select>
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
          <p className="text-3xl font-bold text-white">{alerts.length}</p>
          <p className="text-sm text-gray-400">Total alertes</p>
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

      {alerts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Aucune alerte</p>
        </div>
      )}
    </div>
  );
}
