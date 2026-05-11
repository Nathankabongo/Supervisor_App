import { Miner } from '../store/useStore';
import { X, Heart, Activity, MapPin, Shield, Clock } from 'lucide-react';

interface MinerDetailProps {
  miner: Miner;
  onClose: () => void;
}

export default function MinerDetail({ miner, onClose }: MinerDetailProps) {
  const getStatusColor = () => {
    switch (miner.status) {
      case 'safe': return 'text-accent-green';
      case 'warning': return 'text-accent-orange';
      case 'danger': return 'text-accent-red';
      default: return 'text-accent-green';
    }
  };

  const getStatusBg = () => {
    switch (miner.status) {
      case 'safe': return 'bg-accent-green';
      case 'warning': return 'bg-accent-orange';
      case 'danger': return 'bg-accent-red';
      default: return 'bg-accent-green';
    }
  };

  const getStatusText = () => {
    switch (miner.status) {
      case 'safe': return 'Sécurité';
      case 'warning': return 'Avertissement';
      case 'danger': return 'Danger';
      default: return 'Sécurité';
    }
  };

  return (
    <div className="fixed right-72 top-16 bottom-0 w-80 bg-card border-l border-gray-700 overflow-y-auto z-50">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Détails du Mineur</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-card-hover rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full ${getStatusBg()} flex items-center justify-center text-white text-2xl font-bold`}>
              {miner.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{miner.name}</h3>
              <p className="text-sm text-gray-400">{miner.matricule}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} className={getStatusColor()} />
            <span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
          </div>
        </div>

        {/* Information Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Zone actuelle</p>
              <p className="text-white font-medium">{miner.currentZone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Galerie</p>
              <p className="text-white font-medium">{miner.currentGallery}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Rôle</p>
              <p className="text-white font-medium">{miner.role}</p>
            </div>
          </div>
        </div>

        {/* Health Metrics */}
        <div className="bg-card-hover rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-300">Métriques de santé</h4>
          
          <div className="flex items-center gap-3">
            <Heart size={20} className="text-accent-red" />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Fréquence cardiaque</span>
                <span className="text-sm text-white font-medium">{miner.heartRate} BPM</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-red rounded-full transition-all"
                  style={{ width: `${(miner.heartRate / 130) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity size={20} className="text-accent-green" />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">Niveau d'activité</span>
                <span className="text-sm text-white font-medium">{miner.activityLevel}/10</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green rounded-full transition-all"
                  style={{ width: `${(miner.activityLevel / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Position History */}
        <div className="bg-card-hover rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Historique de position</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-400">Dernière mise à jour:</span>
              <span className="text-white">
                {new Date(miner.position.timestamp).toLocaleTimeString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-gray-400">Position:</span>
              <span className="text-white">
                X: {Math.round(miner.position.x)}, Y: {Math.round(miner.position.y)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity size={16} className="text-gray-400" />
              <span className="text-gray-400">Points de trajectoire:</span>
              <span className="text-white">{miner.trajectory.length}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button className="w-full bg-accent-green text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors">
            Contacter le mineur
          </button>
          <button className="w-full bg-card-hover text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors border border-gray-700">
            Voir l'historique complet
          </button>
          {miner.status === 'danger' && (
            <button className="w-full bg-accent-red text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors">
              Déclencher l'alerte d'urgence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
