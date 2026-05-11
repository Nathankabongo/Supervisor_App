import { FileText, Download, Calendar, BarChart3, Users, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Reports() {
  const { miners, alerts } = useStore();

  const safeCount = miners.filter(m => m.status === 'safe').length;
  const warningCount = miners.filter(m => m.status === 'warning').length;
  const dangerCount = miners.filter(m => m.status === 'danger').length;
  const resolvedAlerts = alerts.filter(a => a.resolved).length;
  const activeAlerts = alerts.filter(a => !a.resolved).length;

  const reportTemplates = [
    { id: 'daily', name: 'Rapport Journalier', desc: 'Activité et incidents de la journée', icon: Clock },
    { id: 'weekly', name: 'Rapport Hebdomadaire', desc: 'Synthèse de la semaine', icon: Calendar },
    { id: 'safety', name: 'Rapport Sécurité', desc: 'Incidents et mesures de sécurité', icon: AlertTriangle },
    { id: 'miners', name: 'Rapport Mineurs', desc: 'Statistiques et activité des mineurs', icon: Users },
    { id: 'stats', name: 'Statistiques Globales', desc: 'Indicateurs de performance', icon: BarChart3 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/LOGO.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Rapports</h1>
            <p className="text-sm text-gray-400">Génération et export de rapports</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors">
          <Download size={16} />
          Exporter PDF
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
          <p className="text-gray-400 text-[10px] mb-1">MINEURS ACTIFS</p>
          <p className="text-green-400 text-xl font-bold">{safeCount}</p>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
          <p className="text-gray-400 text-[10px] mb-1">EN ALERTE</p>
          <p className="text-orange-400 text-xl font-bold">{warningCount}</p>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
          <p className="text-gray-400 text-[10px] mb-1">EN DANGER</p>
          <p className="text-red-400 text-xl font-bold">{dangerCount}</p>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
          <p className="text-gray-400 text-[10px] mb-1">ALERTES ACTIVES</p>
          <p className="text-red-400 text-xl font-bold">{activeAlerts}</p>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3">
          <p className="text-gray-400 text-[10px] mb-1">ALERTES RÉSOLUES</p>
          <p className="text-green-400 text-xl font-bold">{resolvedAlerts}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Report Templates */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-medium text-white">Modèles de rapports</h3>
          {reportTemplates.map(template => {
            const Icon = template.icon;
            return (
              <div key={template.id} className="bg-[#1e293b] rounded border border-gray-700 p-4 flex items-center gap-4 hover:border-green-500/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
                  <Icon size={20} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{template.name}</p>
                  <p className="text-gray-400 text-xs">{template.desc}</p>
                </div>
                <button className="px-3 py-1.5 bg-[#334155] text-white text-xs rounded hover:bg-gray-600 transition-colors">
                  Générer
                </button>
                <button className="px-3 py-1.5 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors">
                  <Download size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Recent Reports */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Rapports récents</h3>
          <div className="bg-[#1e293b] rounded border border-gray-700 divide-y divide-gray-700">
            {[
              { name: 'Rapport Journalier - 02 Mai', date: '02/05/2026', size: '2.4 MB' },
              { name: 'Rapport Sécurité - Avril', date: '01/05/2026', size: '5.1 MB' },
              { name: 'Statistiques Q1 2026', date: '30/04/2026', size: '8.3 MB' },
              { name: 'Rapport Hebdomadaire S17', date: '28/04/2026', size: '3.2 MB' },
              { name: 'Rapport Mineurs - Avril', date: '25/04/2026', size: '4.7 MB' },
            ].map((report, i) => (
              <div key={i} className="p-3 hover:bg-[#334155] transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  <p className="text-white text-xs font-medium flex-1">{report.name}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-5">
                  <span className="text-[10px] text-gray-500">{report.date}</span>
                  <span className="text-[10px] text-gray-500">{report.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
