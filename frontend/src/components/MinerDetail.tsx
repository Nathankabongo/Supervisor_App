import { Miner } from '../store/useStore';
import { X, Heart, Activity, MapPin, Shield, Clock, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MinerDetailProps {
  miner: Miner;
  onClose: () => void;
}

export default function MinerDetail({ miner, onClose }: MinerDetailProps) {
  const navigate = useNavigate();
  const getStatusColor = () => {
    switch (miner.status) {
      case 'safe':
        return 'text-accent-green';
      case 'warning':
        return 'text-accent-orange';
      case 'danger':
        return 'text-accent-red';
      default:
        return 'text-accent-green';
    }
  };

  const getStatusBg = () => {
    switch (miner.status) {
      case 'safe':
        return 'bg-accent-green';
      case 'warning':
        return 'bg-accent-orange';
      case 'danger':
        return 'bg-accent-red';
      default:
        return 'bg-accent-green';
    }
  };

  const getStatusText = () => {
    switch (miner.status) {
      case 'safe':
        return 'Sécurité';
      case 'warning':
        return 'Avertissement';
      case 'danger':
        return 'Danger';
      default:
        return 'Sécurité';
    }
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-[#1e293b] border-l border-gray-700 overflow-y-auto z-50 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Détails du Mineur</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-[#0b1a2a]/60 rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-16 h-16 rounded-full ${getStatusBg()} flex items-center justify-center text-white text-2xl font-bold`}
            >
              {miner.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
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
            <Shield size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Statut opérationnel</p>
              <p className="text-white font-medium flex items-center gap-1.5">
                {miner.isUnderground ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
                    Dans la mine ({miner.currentZone})
                  </>
                ) : miner.isInService ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    En service (Hors mine)
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
                    Hors service (Inactif)
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Zone actuelle / Galerie</p>
              <p className="text-white font-medium">{miner.currentZone} {miner.currentGallery ? `(${miner.currentGallery})` : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Fonction / Rôle</p>
              <p className="text-white font-medium">{miner.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield size={20} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Montre attribuée</p>
              <p className="text-white font-medium font-mono">{miner.watchId || 'Aucune montre liée'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity size={20} className={miner.motion === 'still' ? 'text-amber-400' : 'text-emerald-400'} />
            <div>
              <p className="text-xs text-gray-400">Activité & Mouvement</p>
              <div className="flex items-center gap-2 mt-0.5">
                {miner.motion === 'still' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    ⏸️ Immobile (Détection montre)
                  </span>
                ) : miner.motion === 'walking' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    🚶 En marche
                  </span>
                ) : miner.motion === 'running' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    🏃 En course
                  </span>
                ) : miner.motion === 'fall' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse flex items-center gap-1">
                    ⚠️ Chute détectée
                  </span>
                ) : (
                  <span className="text-white text-sm font-medium">Standard</span>
                )}
                {miner.steps !== undefined && (
                  <span className="text-xs text-gray-400 font-mono">({miner.steps} pas)</span>
                )}
              </div>
            </div>
          </div>

          {miner.phone && (
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Téléphone</p>
                <p className="text-white font-medium">{miner.phone}</p>
              </div>
            </div>
          )}

          {miner.emergencyContact && (
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-red-400" />
              <div>
                <p className="text-xs text-red-400 font-bold">Contact d'urgence</p>
                <p className="text-white font-medium">{miner.emergencyContact}</p>
              </div>
            </div>
          )}

          {miner.bloodGroup && (
            <div className="flex items-center gap-3">
              <Heart size={20} className="text-red-400" />
              <div>
                <p className="text-xs text-gray-400">Groupe sanguin</p>
                <p className="text-red-400 font-bold">{miner.bloodGroup}</p>
              </div>
            </div>
          )}
        </div>

        {/* Health Metrics */}
        <div className="bg-[#0b1a2a]/60 rounded-xl p-4 space-y-4">
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
        <div className="bg-[#0b1a2a]/60 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Historique de position</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-400">Dernière mise à jour:</span>
              <span className="text-white">
                {new Date(miner.position.timestamp).toLocaleTimeString('fr-FR')}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={16} className="text-purple-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-400 block text-xs">Position GPS exacte:</span>
                <span className="text-white font-mono font-medium text-xs">
                  {miner.latitude != null && miner.longitude != null && (miner.latitude !== 0 || miner.longitude !== 0)
                    ? `Lat: ${Number(miner.latitude).toFixed(6)} | Lng: ${Number(miner.longitude).toFixed(6)}`
                    : miner.position?.lat != null && miner.position?.lng != null && (miner.position.lat !== 0 || miner.position.lng !== 0)
                    ? `Lat: ${Number(miner.position.lat).toFixed(6)} | Lng: ${Number(miner.position.lng).toFixed(6)}`
                    : 'En attente de signal GPS satellite'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Navigation size={16} className="text-blue-400 shrink-0" />
              <span className="text-gray-400 text-xs">Coordonnées locales:</span>
              <span className="text-gray-300 font-mono text-xs">
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
          <button
            type="button"
            onClick={() => navigate(`/communicate?miner=${encodeURIComponent(miner.id)}`)}
            className="w-full bg-accent-green text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Contacter le mineur
          </button>
          <button
            type="button"
            onClick={() => navigate('/localisation?tab=trajectoires')}
            className="w-full bg-[#334155] text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors border border-gray-700"
          >
            Voir l'historique complet
          </button>
          {miner.status === 'danger' && (
            <button
              type="button"
              onClick={() => navigate('/crisis-center')}
              className="w-full bg-accent-red text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Déclencher l'alerte d'urgence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
