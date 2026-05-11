import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { AlertTriangle, X, Check, Info } from 'lucide-react';

export default function Notifications() {
  const { alerts, resolveAlert } = useStore();
  const [visibleAlerts, setVisibleAlerts] = useState<typeof alerts>([]);

  useEffect(() => {
    setVisibleAlerts(alerts.filter(a => !a.resolved).slice(0, 5));
  }, [alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'fall': return <AlertTriangle size={20} className="text-red-400" />;
      case 'immobility': return <AlertTriangle size={20} className="text-orange-400" />;
      case 'gas': return <AlertTriangle size={20} className="text-yellow-400" />;
      case 'emergency': return <AlertTriangle size={20} className="text-red-500" />;
      default: return <Info size={20} className="text-blue-400" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'fall': return 'border-red-500 bg-red-500/10';
      case 'immobility': return 'border-orange-500 bg-orange-500/10';
      case 'gas': return 'border-yellow-500 bg-yellow-500/10';
      case 'emergency': return 'border-red-600 bg-red-600/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyen';
      case 'high': return 'Élevé';
      default: return 'Inconnu';
    }
  };

  const getAlertText = (type: string) => {
    switch (type) {
      case 'fall': return 'Chute détectée';
      case 'immobility': return 'Immobilité détectée';
      case 'gas': return 'Fuite de gaz';
      case 'emergency': return 'Urgence';
      default: return 'Alerte';
    }
  };

  const handleDismiss = (alertId: string) => {
    resolveAlert(alertId);
    setVisibleAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-[#1e293b] border-l-4 ${getAlertColor(alert.type)} rounded-lg p-4 shadow-lg animate-slide-in`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white">
                  {getAlertText(alert.type)}
                </h4>
                <span className="text-xs text-gray-400">
                  {getSeverityText(alert.severity)}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                {alert.minerName} - {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  <Check size={12} />
                  Marquer résolu
                </button>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
