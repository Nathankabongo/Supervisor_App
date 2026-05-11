import { useState } from 'react';
import { Search, Heart, MapPin, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Miners() {
  const { miners, setSelectedMiner } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredMiners = miners.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.matricule.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || m.currentZone === zoneFilter;
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesStatus && matchesZone && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'safe': return 'Actif';
      case 'warning': return 'Alerte';
      case 'danger': return 'Danger';
      default: return 'Actif';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500/20 text-green-400';
      case 'warning': return 'bg-orange-500/20 text-orange-400';
      case 'danger': return 'bg-red-500/20 text-red-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  const zones = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'];
  const roles = ['Foreur', 'Opérateur', 'Technicien', 'Ingénieur', 'Sécurité'];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Mineurs</h1>
            <p className="text-sm text-gray-400">{miners.length} mineurs enregistrés</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded text-green-400 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {miners.filter(m => m.status === 'safe').length} actifs
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 rounded text-orange-400 text-xs">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            {miners.filter(m => m.status === 'warning').length} alertes
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 rounded text-red-400 text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            {miners.filter(m => m.status === 'danger').length} dangers
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Tous statuts</option>
          <option value="safe">Actif</option>
          <option value="warning">Alerte</option>
          <option value="danger">Danger</option>
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Toutes zones</option>
          {zones.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Tous rôles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Miners Table - Desktop */}
      <div className="hidden md:block bg-[#1e293b] rounded border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Mineur</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Matricule</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rôle</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Zone</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Statut</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Fréq. Cardiaque</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Activité</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMiners.map((miner) => (
              <tr key={miner.id} className="border-b border-gray-700/50 hover:bg-[#334155] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${getStatusColor(miner.status)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                      {miner.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-white text-sm">{miner.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">{miner.matricule}</td>
                <td className="px-4 py-3 text-gray-300 text-sm">{miner.role}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-300 text-sm">
                    <MapPin size={14} className="text-gray-500" />
                    {miner.currentZone}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBg(miner.status)}`}>
                    {getStatusLabel(miner.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className={miner.heartRate > 100 ? 'text-red-400' : 'text-gray-400'} />
                    <span className={`text-sm ${miner.heartRate > 100 ? 'text-red-400' : 'text-gray-300'}`}>
                      {miner.heartRate} bpm
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${miner.activityLevel > 7 ? 'bg-green-500' : miner.activityLevel > 4 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${miner.activityLevel * 10}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">{miner.activityLevel}/10</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelectedMiner(miner)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Miners Cards - Mobile */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filteredMiners.map((miner) => (
          <div key={miner.id} className="bg-[#1e293b] rounded border border-gray-700 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${getStatusColor(miner.status)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                  {miner.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{miner.name}</h3>
                  <p className="text-gray-400 text-xs">{miner.matricule}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMiner(miner)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400 text-xs">Rôle</span>
                <p className="text-gray-300">{miner.role}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Zone</span>
                <p className="text-gray-300 flex items-center gap-1">
                  <MapPin size={12} className="text-gray-500" />
                  {miner.currentZone}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Statut</span>
                <p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBg(miner.status)}`}>
                    {getStatusLabel(miner.status)}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Fréq. Cardiaque</span>
                <p className={`flex items-center gap-1 ${miner.heartRate > 100 ? 'text-red-400' : 'text-gray-300'}`}>
                  <Heart size={12} className={miner.heartRate > 100 ? 'text-red-400' : 'text-gray-400'} />
                  {miner.heartRate} bpm
                </p>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-gray-400 text-xs">Activité</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${miner.activityLevel > 7 ? 'bg-green-500' : miner.activityLevel > 4 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${miner.activityLevel * 10}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs">{miner.activityLevel}/10</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
        <span>{filteredMiners.length} mineurs affichés sur {miners.length}</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-[#1e293b] border border-gray-700 rounded hover:bg-[#334155]">Précédent</button>
          <button className="px-3 py-1 bg-green-500 text-white rounded">1</button>
          <button className="px-3 py-1 bg-[#1e293b] border border-gray-700 rounded hover:bg-[#334155]">2</button>
          <button className="px-3 py-1 bg-[#1e293b] border border-gray-700 rounded hover:bg-[#334155]">Suivant</button>
        </div>
      </div>
    </div>
  );
}
