import { useStore } from '../../store/useStore';

export default function FilterPanel() {
  const { filters, setFilters } = useStore();

  return (
    <div className="bg-[#1e293b] rounded-xl p-3 border border-gray-700">
      <h3 className="text-xs font-semibold text-white mb-3">FILTRES</h3>
      
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Zone</label>
          <select
            value={filters.zone}
            onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
            className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Toutes les zones</option>
            <option value="ZONE A">ZONE A</option>
            <option value="ZONE B">ZONE B</option>
            <option value="ZONE C">ZONE C</option>
            <option value="ZONE D">ZONE D</option>
            <option value="ZONE E">ZONE E</option>
            <option value="ZONE F">ZONE F</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Statut</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Tous</option>
            <option value="safe">Normal</option>
            <option value="warning">Alerte</option>
            <option value="danger">Danger</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Fonction</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="w-full bg-[#0b1a2a] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Tous</option>
            <option value="Creuseur">Creuseur</option>
            <option value="Transporteur">Transporteur</option>
            <option value="Technicien">Technicien</option>
            <option value="Superviseur">Superviseur</option>
            <option value="Médecin">Médecin</option>
          </select>
        </div>

        <div className="pt-1">
          <button
            onClick={() => setFilters({ zone: 'all', status: 'all', role: 'all', searchQuery: '' })}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
