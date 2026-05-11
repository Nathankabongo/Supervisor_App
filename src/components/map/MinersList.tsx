import { useState } from 'react';
import { Miner } from '../../store/useStore';
import { Heart, Search, Bell } from 'lucide-react';

interface MinersListProps {
  miners: Miner[];
  onMinerClick: (miner: Miner) => void;
}

export default function MinersList({ miners, onMinerClick }: MinersListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMiners = miners.filter((miner) =>
    miner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    miner.matricule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-orange-400';
      case 'danger': return 'text-red-400';
      default: return 'text-green-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-xl p-3 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-xs font-semibold text-white">
          MINEURS ({miners.length})
        </h3>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2 shrink-0">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0b1a2a] border border-gray-700 rounded pl-8 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Miners List */}
      <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
        {filteredMiners.map((miner) => (
          <div
            key={miner.id}
            onClick={() => onMinerClick(miner)}
            className="flex items-center gap-2 p-1.5 bg-[#0b1a2a] rounded hover:bg-[#1e3a5a] cursor-pointer transition-colors border border-transparent hover:border-gray-600"
          >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-full ${getStatusBg(miner.status)} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}>
              {miner.name.split(' ').map(n => n[0]).join('')}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white truncate">{miner.name}</p>
              <p className="text-[9px] text-gray-400 truncate">{miner.currentZone}</p>
            </div>

            {/* Health/Heart */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Heart size={10} className="text-red-400" />
              <span className="text-[9px] text-gray-400">{Math.round((miner.heartRate / 130) * 100)}%</span>
            </div>

            {/* Alert Indicator */}
            {miner.status !== 'safe' && (
              <Bell size={12} className={getStatusColor(miner.status)} />
            )}
          </div>
        ))}
      </div>

      <button className="w-full mt-2 text-blue-400 text-[10px] hover:text-blue-300 transition-colors shrink-0">
        Voir tous →
      </button>
    </div>
  );
}
