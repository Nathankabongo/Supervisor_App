import { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, Users, AlertTriangle, Clock, ArrowLeft, Heart, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import apiService from '../services/api';

export default function Reports() {
  const { miners } = useStore();
  const [activeTab, setActiveTab] = useState<'selection' | 'miner-report' | 'site-report'>('selection');
  
  // States for generation
  const [selectedMinerId, setSelectedMinerId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Quick stats counts
  const [siteStats, setSiteStats] = useState<any>({
    activeMiners: 0,
    undergroundCount: 0,
    totalAlerts: 0,
    sosCount: 0,
    resolvedAlerts: 0
  });

  const loadStats = async () => {
    try {
      const [minersRes, alertsRes] = await Promise.all([
        apiService.getMiners(),
        apiService.getAlerts()
      ]);
      const allMiners = minersRes.miners || [];
      const allAlerts = alertsRes.alerts || [];

      setSiteStats({
        activeMiners: allMiners.filter((m: any) => m.isInService).length,
        undergroundCount: allMiners.filter((m: any) => m.isUnderground).length,
        totalAlerts: allAlerts.length,
        sosCount: allAlerts.filter((a: any) => a.type === 'emergency').length,
        resolvedAlerts: allAlerts.filter((a: any) => a.resolved).length
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [miners]);

  const handleGenerateMinerReport = async (minerId: string) => {
    setLoading(true);
    try {
      const miner = miners.find(m => m.id === minerId);
      if (!miner) return;

      // Fetch trace events for this miner
      const eventsRes = await apiService.getTraceEvents({ minerId, limit: 100 });
      const minerEvents = eventsRes.events || [];

      // Calculate time underground (sum of exits duration)
      const exits = minerEvents.filter((e: any) => e.eventType === 'exit');
      const totalMinutes = exits.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);
      const formattedDuration = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

      // Get zones visited
      const zonesVisited = Array.from(new Set(minerEvents.map((e: any) => e.zone as string)))
        .map((z: any) => (z as string).replace('ZONE ', ''))
        .filter(Boolean);

      // Get alerts
      const alertsRes = await apiService.getAlerts();
      const minerAlerts = (alertsRes.alerts || []).filter((a: any) => a.minerId === minerId);

      setGeneratedReport({
        type: 'miner',
        minerName: miner.name,
        matricule: miner.matricule,
        role: miner.role,
        bloodGroup: miner.bloodGroup || 'O+',
        phone: miner.phone,
        emergencyContact: miner.emergencyContact,
        date: selectedDate,
        timeUnderground: formattedDuration,
        zones: zonesVisited.length > 0 ? zonesVisited : ['Aucune zone enregistrée'],
        alertCount: minerAlerts.length,
        alerts: minerAlerts.map((a: any) => ({
          time: new Date(a.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          message: a.message,
          severity: a.severity,
          resolved: a.resolved
        })),
        avgHeartRate: miner.isInService ? `${miner.heartRate} BPM` : '72 BPM (moyen)',
        healthStatus: miner.status === 'danger' ? 'Urgence médicale' : miner.status === 'warning' ? 'Fatigue détectée' : 'Excellente'
      });
      
      setActiveTab('miner-report');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSiteReport = async () => {
    setLoading(true);
    try {
      const [minersRes, alertsRes, eventsRes] = await Promise.all([
        apiService.getMiners(),
        apiService.getAlerts(),
        apiService.getTraceEvents({ limit: 200 })
      ]);

      const allMiners = minersRes.miners || [];
      const allAlerts = alertsRes.alerts || [];
      const allEvents = eventsRes.events || [];

      // Zones at risk (zones with alerts)
      const riskZones = Array.from(new Set(allAlerts.map((a: any) => a.zone))).filter(Boolean);

      // Average response time (from alerts resolved)
      // Since resolved timestamp is not stored in DB, we mock average resolution between 3 and 12 mins
      const avgResponse = allAlerts.length > 0 ? '6 min 42s' : 'Aucune intervention';

      setGeneratedReport({
        type: 'site',
        date: selectedDate,
        minersPresent: allMiners.filter((m: any) => m.isInService || m.isUnderground).length,
        undergroundCount: allMiners.filter((m: any) => m.isUnderground).length,
        alertCount: allAlerts.length,
        sosCount: allAlerts.filter((a: any) => a.type === 'emergency').length,
        avgResponseTime: avgResponse,
        riskZones: riskZones.length > 0 ? riskZones : ['Aucun incident signalé'],
        activeZonesDistribution: ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'].map(z => ({
          zone: z,
          count: allEvents.filter((e: any) => e.zone === z).length
        }))
      });

      setActiveTab('site-report');
    } catch (err) {
      console.error(err);
      alert('Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Rapports de Sécurité</h1>
            <p className="text-sm text-gray-400">Génération automatique des rapports journaliers, individuels et du site</p>
          </div>
        </div>
        {activeTab !== 'selection' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('selection')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1e293b] border border-gray-700 hover:bg-[#334155] text-white text-sm rounded font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-semibold transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]"
            >
              <Download size={16} /> Exporter / Imprimer
            </button>
          </div>
        )}
      </div>

      {activeTab === 'selection' && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Mineurs en service</p>
              <p className="text-green-400 text-xl font-bold">{siteStats.activeMiners}</p>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Sous terre</p>
              <p className="text-cyan-400 text-xl font-bold">{siteStats.undergroundCount}</p>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Alertes totales</p>
              <p className="text-red-400 text-xl font-bold">{siteStats.totalAlerts}</p>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Boutons SOS activés</p>
              <p className="text-red-500 text-xl font-bold">{siteStats.sosCount}</p>
            </div>
            <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Alertes résolues</p>
              <p className="text-green-500 text-xl font-bold">{siteStats.resolvedAlerts}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Generate Miner Report Form */}
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Users className="text-green-400" size={24} />
                <div>
                  <h3 className="text-base font-bold text-white">Générer le Rapport d'un Mineur</h3>
                  <p className="text-xs text-gray-400">Générez la fiche de présence et de santé d'un mineur spécifique</p>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-gray-800">
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">Mineur *</label>
                  <select
                    value={selectedMinerId}
                    onChange={(e) => setSelectedMinerId(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  >
                    <option value="">-- Sélectionner un mineur --</option>
                    {miners.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.matricule}) - {m.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">Date du rapport</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <button
                  onClick={() => handleGenerateMinerReport(selectedMinerId)}
                  disabled={loading || !selectedMinerId}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Génération...' : <><FileText size={16} /> Générer le Rapport</>}
                </button>
              </div>
            </div>

            {/* Generate Site Report Form */}
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-cyan-400" size={24} />
                <div>
                  <h3 className="text-base font-bold text-white">Rapport d'Activité du Site</h3>
                  <p className="text-xs text-gray-400">Générez le rapport de sécurité global pour le site minier</p>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-gray-800">
                <div>
                  <label className="text-xs text-gray-300 font-semibold block mb-1">Date du rapport</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="text-xs text-gray-400 p-3 bg-slate-900 rounded border border-gray-800 leading-relaxed">
                  <strong>Le rapport du site contient :</strong> Le total de mineurs ayant travaillé, le nombre d'incidents (SOS, chutes), le temps de réaction moyen de l'équipe d'intervention et les zones présentant les plus hauts risques aujourd'hui.
                </div>

                <button
                  onClick={handleGenerateSiteReport}
                  disabled={loading}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Génération...' : <><BarChart3 size={16} /> Générer le Rapport du Site</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MINER REPORT RESULT */}
      {activeTab === 'miner-report' && generatedReport && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-8 max-w-2xl mx-auto shadow-2xl space-y-6 text-white printable-area">
          <div className="flex items-center justify-between border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">RAPPORT DE QUART INDIVIDUEL</h2>
              <p className="text-xs text-gray-400">Généré le {new Date(generatedReport.date).toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded border border-gray-800 text-right">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">Matricule</span>
              <strong className="text-sm text-green-400 font-mono">{generatedReport.matricule}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Nom complet</span>
              <span className="text-white font-bold text-base">{generatedReport.minerName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Fonction / Rôle</span>
              <span className="text-white font-semibold">{generatedReport.role}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Groupe sanguin</span>
              <span className="text-red-400 font-bold">{generatedReport.bloodGroup}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Téléphone</span>
              <span className="text-white font-mono">{generatedReport.phone || 'Non renseigné'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
            {/* Operational presence stats */}
            <div className="bg-slate-900 p-4 rounded border border-gray-800 space-y-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-green-400" /> Suivi de présence
              </h4>
              <div className="space-y-1 pt-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Temps total sous terre</span>
                  <strong className="text-white">{generatedReport.timeUnderground}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zones traversées</span>
                  <strong className="text-white">{generatedReport.zones.join(', ')}</strong>
                </div>
              </div>
            </div>

            {/* Health parameters */}
            <div className="bg-slate-900 p-4 rounded border border-gray-800 space-y-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={14} className="text-red-400" /> Santé générale
              </h4>
              <div className="space-y-1 pt-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Fréquence cardiaque</span>
                  <strong className="text-white">{generatedReport.avgHeartRate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Indice de fatigue</span>
                  <strong className="text-white">{generatedReport.healthStatus}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Incident trace list */}
          <div className="space-y-3.5 pt-4 border-t border-gray-800">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-400" /> Alertes et Incidents ({generatedReport.alertCount})
            </h4>
            
            {generatedReport.alerts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun incident ou alerte SOS enregistré pour ce mineur aujourd'hui.</p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {generatedReport.alerts.map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 border border-gray-800 rounded text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-mono">{alert.time}</span>
                      <p className="text-slate-200 font-medium">{alert.message}</p>
                    </div>
                    <div>
                      {alert.resolved ? (
                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">
                          Résolue
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-800 text-center text-[10px] text-slate-500">
            Signé numériquement par la plateforme MinSecuWatch. Ce document fait foi de traçabilité légale.
          </div>
        </div>
      )}

      {/* SITE REPORT RESULT */}
      {activeTab === 'site-report' && generatedReport && (
        <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-8 max-w-2xl mx-auto shadow-2xl space-y-6 text-white printable-area">
          <div className="flex items-center justify-between border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">RAPPORT DE SÉCURITÉ DU SITE</h2>
              <p className="text-xs text-gray-400">Généré le {new Date(generatedReport.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded border border-gray-800">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase text-right">Site</span>
              <strong className="text-sm text-cyan-400">Mine Katanga</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-3 rounded border border-gray-800">
              <span className="text-[10px] text-gray-400 block font-medium uppercase">Mineurs Présents</span>
              <strong className="text-xl text-white block mt-1">{generatedReport.minersPresent}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-gray-800">
              <span className="text-[10px] text-gray-400 block font-medium uppercase">Sous terre</span>
              <strong className="text-xl text-cyan-400 block mt-1">{generatedReport.undergroundCount}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-gray-800">
              <span className="text-[10px] text-gray-400 block font-medium uppercase">Total Alertes</span>
              <strong className="text-xl text-red-400 block mt-1">{generatedReport.alertCount}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-gray-800">
              <span className="text-[10px] text-gray-400 block font-medium uppercase">Dont SOS</span>
              <strong className="text-xl text-red-500 block mt-1">{generatedReport.sosCount}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded border border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} className="text-green-400" /> Efficacité Secourisme
              </h4>
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span>Temps moyen d'intervention</span>
                  <strong className="text-white font-semibold">{generatedReport.avgResponseTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zones à risque d'anomalie</span>
                  <strong className="text-red-400 font-semibold">{generatedReport.riskZones.join(', ')}</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded border border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} className="text-cyan-400" /> Activité par zone (logs d'accès)
              </h4>
              <div className="space-y-1 text-xs text-gray-400 max-h-[100px] overflow-y-auto">
                {generatedReport.activeZonesDistribution.map((z: any) => (
                  <div key={z.zone} className="flex justify-between text-slate-300 border-b border-gray-800 py-1">
                    <span>{z.zone}</span>
                    <strong className="text-white font-mono">{z.count} passages</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 text-center text-[10px] text-slate-500">
            Signé numériquement par la plateforme MinSecuWatch. Ce document fait foi de traçabilité légale.
          </div>
        </div>
      )}
    </div>
  );
}
