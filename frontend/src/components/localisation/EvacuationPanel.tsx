import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Compass,
  MapPin,
  Milestone,
  Route,
  ShieldAlert,
  User,
  Footprints,
  Watch,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Interactive3DMap, { getZoneForCoords } from '../map/Interactive3DMap';
import {
  computeTrajectoryDistance,
  findWatchUrgencyAlert,
  getRouteToMiner,
  getZoneDepthLabel,
  isKnownMineZone,
} from './evacuationRoutes';

const GATEWAYS = [
  { id: 'GW-01', x: 165, y: 140, zone: 'ZONE A' },
  { id: 'GW-02', x: 425, y: 140, zone: 'ZONE B' },
  { id: 'GW-03', x: 675, y: 140, zone: 'ZONE C' },
  { id: 'GW-04', x: 165, y: 370, zone: 'ZONE D' },
  { id: 'GW-05', x: 425, y: 400, zone: 'ZONE E' },
  { id: 'GW-06', x: 675, y: 400, zone: 'ZONE F' },
];

function zoneLabelFromPoint(x: number, y: number): string {
  return getZoneForCoords(x, y);
}

export default function EvacuationPanel() {
  const { miners, selectedMiner, setSelectedMiner, alerts } = useStore();
  const [showOthers, setShowOthers] = useState(false);

  const focusMiner = selectedMiner;
  const relatedAlert = useMemo(
    () => findWatchUrgencyAlert(alerts, focusMiner?.id),
    [alerts, focusMiner],
  );

  const hasWatch = !!(focusMiner?.watchId || (focusMiner as { watch_id?: string } | null)?.watch_id);
  const canShowUrgence = !!(focusMiner && relatedAlert && hasWatch);

  /** Zone issue de l'alerte montre, sinon dernière zone connue du store (alimentée par location-update). */
  const watchZone = relatedAlert?.zone || focusMiner?.currentZone || '';
  const zoneKnown = isKnownMineZone(watchZone);

  const route = useMemo(() => {
    if (!canShowUrgence || !zoneKnown) return null;
    return getRouteToMiner(watchZone, focusMiner?.currentGallery || '');
  }, [canShowUrgence, zoneKnown, watchZone, focusMiner?.currentGallery]);

  const realTrajectory = useMemo(() => {
    if (!focusMiner?.trajectory?.length) return [];
    // Un seul point seedé sans historique GPS n'est pas un déplacement
    return focusMiner.trajectory;
  }, [focusMiner]);

  const trajectoryEvents = useMemo(() => {
    if (realTrajectory.length < 2) return [];
    const events: { zone: string; time: string; timestamp: number }[] = [];
    let currentZone = '';
    realTrajectory.forEach((point) => {
      const zoneName = zoneLabelFromPoint(point.x, point.y);
      if (zoneName !== currentZone) {
        events.push({
          zone: zoneName,
          time: new Date(point.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          timestamp: point.timestamp,
        });
        currentZone = zoneName;
      }
    });
    return events;
  }, [realTrajectory]);

  const trajDistance = computeTrajectoryDistance(realTrajectory);
  const hasRealDisplacement = realTrajectory.length > 1;

  const mapMiners = useMemo(() => {
    if (!focusMiner) return miners;
    if (showOthers) return miners;
    return miners.filter((m) => m.id === focusMiner.id);
  }, [miners, focusMiner, showOthers]);

  const selectedSite = useMemo(() => {
    if (!zoneKnown) return 'all' as const;
    const z = watchZone.toUpperCase();
    if (z.includes('ZONE D') || z.includes('ZONE E') || z.includes('ZONE F')) {
      return 'underground' as const;
    }
    if (z.includes('ZONE A') || z.includes('ZONE B') || z.includes('ZONE C')) {
      return 'open_pit' as const;
    }
    return 'all' as const;
  }, [zoneKnown, watchZone]);

  if (!focusMiner) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b1a2a] p-8">
        <div className="max-w-md text-center space-y-3 border border-red-500/30 bg-red-950/20 rounded-xl p-6">
          <AlertTriangle className="mx-auto text-red-400" size={32} />
          <h2 className="text-lg font-bold text-white">Aucun creuseur sélectionné</h2>
          <p className="text-sm text-slate-400">
            Utilisez « Localiser » uniquement depuis une alerte SOS / chute réelle envoyée par la
            montre.
          </p>
        </div>
      </div>
    );
  }

  if (!relatedAlert) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b1a2a] p-8">
        <div className="max-w-md text-center space-y-3 border border-amber-500/30 bg-amber-950/20 rounded-xl p-6">
          <Watch className="mx-auto text-amber-400" size={32} />
          <h2 className="text-lg font-bold text-white">Pas d&apos;alerte montre active</h2>
          <p className="text-sm text-slate-400">
            La vue Urgence (3D, déplacements, évacuation) ne s&apos;ouvre que lorsqu&apos;une alerte{' '}
            <strong className="text-slate-200">SOS</strong> ou{' '}
            <strong className="text-slate-200">chute</strong> non résolue est reçue de la montre de{' '}
            <strong className="text-white">{focusMiner.name}</strong>. Aucune simulation.
          </p>
        </div>
      </div>
    );
  }

  if (!hasWatch) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b1a2a] p-8">
        <div className="max-w-md text-center space-y-3 border border-amber-500/30 bg-amber-950/20 rounded-xl p-6">
          <Watch className="mx-auto text-amber-400" size={32} />
          <h2 className="text-lg font-bold text-white">Montre non assignée</h2>
          <p className="text-sm text-slate-400">
            Impossible de localiser en urgence :{' '}
            <strong className="text-white">{focusMiner.name}</strong> n&apos;a pas de montre
            (watchId) associée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0b1a2a]">
      {/* Urgency banner */}
      <div className="shrink-0 px-4 py-3 border-b border-red-500/40 bg-gradient-to-r from-red-950/80 via-red-900/40 to-[#0b1a2a]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                Mode urgence — alerte montre réelle
              </p>
              <h2 className="text-base font-bold text-white truncate flex items-center gap-2">
                <User size={16} className="text-slate-300 shrink-0" />
                {focusMiner.name}
                <span className="text-xs font-mono text-slate-400 font-normal">
                  {focusMiner.matricule}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 bg-black/40 border border-slate-700 px-2 py-0.5 rounded">
                  <MapPin size={11} className="text-cyan-400" />
                  {zoneKnown
                    ? `${watchZone}${focusMiner.currentGallery ? ` · ${focusMiner.currentGallery}` : ''}`
                    : 'Zone inconnue (montre)'}
                </span>
                {zoneKnown && (
                  <span className="inline-flex items-center gap-1 bg-black/40 border border-slate-700 px-2 py-0.5 rounded">
                    Profondeur : {getZoneDepthLabel(watchZone)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/40 text-red-300 px-2 py-0.5 rounded">
                  {relatedAlert.type === 'emergency' ? 'SOS' : 'Chute'}
                </span>
                {(focusMiner.watchId || (focusMiner as { watch_id?: string }).watch_id) && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded font-mono text-[10px]">
                    <Watch size={11} />
                    {focusMiner.watchId || (focusMiner as { watch_id?: string }).watch_id}
                  </span>
                )}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOthers}
              onChange={(e) => setShowOthers(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/40"
            />
            Afficher les autres mineurs
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_380px]">
        {/* 3D model + trajectory path */}
        <div className="min-h-[360px] xl:min-h-0 border-b xl:border-b-0 xl:border-r border-slate-800 relative">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 border border-cyan-500/40 text-cyan-300 px-2 py-1 rounded">
              Modèle 3D · position montre
            </span>
            {hasRealDisplacement ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 border border-amber-500/40 text-amber-300 px-2 py-1 rounded">
                Trajectoire GPS montre
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 border border-slate-600 text-slate-400 px-2 py-1 rounded">
                Aucun déplacement reçu
              </span>
            )}
          </div>
          <Interactive3DMap
            miners={mapMiners}
            selectedMiner={focusMiner}
            onMinerClick={setSelectedMiner}
            showTrajectories={hasRealDisplacement}
            showAlerts
            showGateways
            gateways={GATEWAYS}
            selectedSite={selectedSite}
            urgencyFocus
          />
        </div>

        {/* Right rail: evacuation + displacement */}
        <div className="min-h-0 overflow-y-auto p-3 space-y-3 bg-[#0f172a]">
          {/* Plan d'évacuation */}
          {route ? (
            <section className="bg-[#1e293b] rounded-lg border border-red-500/25 p-3 space-y-3">
              <div className="border-b border-slate-700 pb-2">
                <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
                  <Compass size={14} className="text-red-400" />
                  Plan d&apos;évacuation / accès secours
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{route.title}</p>
                <p className="text-[10px] text-amber-400/90 mt-1 border border-amber-500/20 bg-amber-950/30 rounded px-2 py-1">
                  Procédure opérationnelle pour la zone{' '}
                  <strong className="text-amber-200">{route.sourceZone}</strong> (dernière zone
                  connue via montre / alerte) — distances et temps ne sont pas une télémétrie live.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0b1a2a] border border-slate-700 p-2 rounded flex items-center gap-2">
                  <div className="p-1 bg-blue-500/10 text-blue-400 rounded">
                    <Milestone size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Distance (procédure)</span>
                    <span className="text-xs font-semibold text-white">{route.distance}</span>
                  </div>
                </div>
                <div className="bg-[#0b1a2a] border border-slate-700 p-2 rounded flex items-center gap-2">
                  <div className="p-1 bg-amber-500/10 text-amber-400 rounded">
                    <Clock size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Temps (procédure)</span>
                    <span className="text-xs font-semibold text-white">~ {route.estTime}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b1a2a]/60 border border-slate-700/80 rounded p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <ShieldAlert size={11} className="text-yellow-500" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                    EPI recommandés
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {route.safetyGear.map((gear) => (
                    <span
                      key={gear}
                      className="text-[8.5px] bg-slate-800 text-yellow-400 px-1.5 py-0.5 rounded border border-slate-700 font-medium"
                    >
                      ✓ {gear}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Étapes d&apos;accès
                </span>
                <div className="space-y-2.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {route.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start relative">
                      <div className="w-6 h-6 shrink-0 rounded-full bg-slate-900 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-300 font-mono z-10">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pt-0.5 flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-[#1e293b] rounded-lg border border-slate-700 p-3">
              <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase mb-2">
                <Compass size={14} className="text-slate-400" />
                Plan d&apos;évacuation
              </h3>
              <p className="text-xs text-slate-400">
                Zone du creuseur inconnue depuis la montre. Impossible d&apos;afficher une procédure
                d&apos;accès par zone. Attendez une mise à jour de localisation (
                <code className="text-slate-300">location-update</code>) ou une zone dans
                l&apos;alerte.
              </p>
            </section>
          )}

          {/* Déplacements — données GPS montre uniquement */}
          <section className="bg-[#1e293b] rounded-lg border border-slate-700 p-3 space-y-3">
            <div className="border-b border-slate-700 pb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
                <Footprints size={14} className="text-amber-400" />
                Déplacements (montre)
              </h3>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Route size={11} />
                {trajDistance > 0 ? `${trajDistance} u. carte` : '—'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#0b1a2a] rounded border border-slate-700 p-2">
                <p className="text-[9px] text-slate-500 uppercase">Points GPS</p>
                <p className="text-sm font-bold text-white">{realTrajectory.length}</p>
              </div>
              <div className="bg-[#0b1a2a] rounded border border-slate-700 p-2">
                <p className="text-[9px] text-slate-500 uppercase">Position X</p>
                <p className="text-sm font-bold text-cyan-300">
                  {focusMiner.position ? Math.round(focusMiner.position.x) : '—'}
                </p>
              </div>
              <div className="bg-[#0b1a2a] rounded border border-slate-700 p-2">
                <p className="text-[9px] text-slate-500 uppercase">Position Y</p>
                <p className="text-sm font-bold text-cyan-300">
                  {focusMiner.position ? Math.round(focusMiner.position.y) : '—'}
                </p>
              </div>
            </div>

            {hasRealDisplacement && trajectoryEvents.length > 0 ? (
              <div className="relative pl-5 border-l border-amber-500/30 space-y-3 ml-1 max-h-56 overflow-y-auto">
                {trajectoryEvents.map((ev, i) => (
                  <div key={`${ev.timestamp}-${i}`} className="relative">
                    <span className="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900" />
                    <p className="text-[10px] text-amber-300/80 font-mono">{ev.time}</p>
                    <p className="text-xs text-white font-medium">{ev.zone}</p>
                  </div>
                ))}
                <div className="relative">
                  <span className="absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-slate-900 animate-pulse" />
                  <p className="text-[10px] text-red-300/80 font-mono">Dernière position montre</p>
                  <p className="text-xs text-white font-medium">
                    {zoneKnown ? watchZone : 'Zone inconnue'}
                    {focusMiner.currentGallery ? ` · ${focusMiner.currentGallery}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 border border-slate-700/60 rounded p-2.5 bg-[#0b1a2a]/50">
                Aucun déplacement reçu de la montre. La trajectoire n&apos;est affichée que lorsque
                des points GPS arrivent via les mises à jour de localisation de la montre — aucun
                chemin n&apos;est inventé.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
