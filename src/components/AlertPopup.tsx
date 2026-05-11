import { Alert } from '../store/useStore';
import { AlertTriangle, X, User, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AlertPopupProps {
  alert: Alert;
  onClose: () => void;
  onResolve: () => void;
}

export default function AlertPopup({ alert, onClose, onResolve }: AlertPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'high': return 'border-accent-red bg-red-900/20';
      case 'medium': return 'border-accent-orange bg-orange-900/20';
      case 'low': return 'border-yellow-500 bg-yellow-900/20';
      default: return 'border-accent-red bg-red-900/20';
    }
  };

  const getAlertTypeText = () => {
    switch (alert.type) {
      case 'fall': return 'Chute détectée';
      case 'immobility': return 'Immobilité détectée';
      case 'gas': return 'Niveau de gaz élevé';
      case 'emergency': return 'Urgence';
      default: return 'Alerte';
    }
  };

  const getAlertTypeIcon = () => {
    return <AlertTriangle size={20} className="text-accent-red" />;
  };

  return (
    <div
      className={`fixed top-20 right-4 w-96 rounded-lg border-2 p-4 shadow-lg transition-all duration-300 ${
        getSeverityColor()
      } ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getAlertTypeIcon()}
          <h3 className="text-white font-semibold">{getAlertTypeText()}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User size={16} className="text-gray-400" />
          <span className="text-gray-300">{alert.minerName}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-gray-300">
            {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Sévérité:</span>
          <span className={`font-medium ${
            alert.severity === 'high' ? 'text-accent-red' :
            alert.severity === 'medium' ? 'text-accent-orange' :
            'text-yellow-500'
          }`}>
            {alert.severity === 'high' ? 'Élevée' :
             alert.severity === 'medium' ? 'Moyenne' :
             'Faible'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onResolve}
          className="flex-1 bg-accent-green text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          Résoudre
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-card-hover text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors border border-gray-700"
        >
          Ignorer
        </button>
      </div>
    </div>
  );
}
