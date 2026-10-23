import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map, Route, Footprints, Siren } from 'lucide-react';
import MapPanel from '../components/localisation/MapPanel';
import TrajectoriesPanel from '../components/localisation/TrajectoriesPanel';
import TraceabilityPanel from '../components/localisation/TraceabilityPanel';
import EvacuationPanel from '../components/localisation/EvacuationPanel';

export type LocalisationTab = 'carte' | 'trajectoires' | 'tracabilite' | 'evacuation';

const TABS: { id: LocalisationTab; label: string; icon: typeof Map }[] = [
  { id: 'carte', label: 'Carte live', icon: Map },
  { id: 'trajectoires', label: 'Trajectoires', icon: Route },
  { id: 'tracabilite', label: 'Traçabilité', icon: Footprints },
  { id: 'evacuation', label: 'Urgence', icon: Siren },
];

function normalizeTab(value: string | null, mode: string | null): LocalisationTab {
  if (mode === 'urgence' || mode === 'evacuation' || mode === 'sos') return 'evacuation';
  if (value === 'evacuation' || value === 'urgence' || value === 'sos') return 'evacuation';
  if (value === 'trajectoires' || value === 'trajectories') return 'trajectoires';
  if (value === 'tracabilite' || value === 'traceability') return 'tracabilite';
  return 'carte';
}

export default function Localisation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = useMemo(
    () => normalizeTab(searchParams.get('tab'), searchParams.get('mode')),
    [searchParams],
  );

  // Canonicalise ?tab=carte&mode=urgence → ?tab=evacuation
  useEffect(() => {
    const mode = searchParams.get('mode');
    const tab = searchParams.get('tab');
    if (
      mode === 'urgence' ||
      mode === 'evacuation' ||
      mode === 'sos' ||
      tab === 'urgence' ||
      tab === 'sos'
    ) {
      if (tab !== 'evacuation' || mode) {
        navigate('/localisation?tab=evacuation', { replace: true });
      }
    }
  }, [searchParams, navigate]);

  const setTab = (tab: LocalisationTab) => {
    navigate(`/localisation?tab=${tab}`, { replace: true });
  };

  const isUrgence = activeTab === 'evacuation';

  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        className={`shrink-0 px-4 pt-4 pb-2 border-b bg-[#0f172a] ${
          isUrgence ? 'border-red-500/40' : 'border-slate-800/80'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">
              {isUrgence ? 'Localisation — Urgence' : 'Localisation'}
            </h1>
            <p className="text-xs text-slate-400">
              {isUrgence
                ? 'Activé uniquement sur alerte SOS / chute réelle de la montre — 3D, trajectoire GPS et procédure de zone'
                : 'Carte live, trajectoires GPS et traçabilité des travailleurs'}
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 w-fit max-w-full overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const isEvac = id === 'evacuation';
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? isEvac
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-cyan-600 text-white shadow-sm'
                    : isEvac
                      ? 'text-red-300 hover:text-white hover:bg-red-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'carte' && <MapPanel />}
        {activeTab === 'trajectoires' && <TrajectoriesPanel />}
        {activeTab === 'tracabilite' && <TraceabilityPanel />}
        {activeTab === 'evacuation' && <EvacuationPanel />}
      </div>
    </div>
  );
}
