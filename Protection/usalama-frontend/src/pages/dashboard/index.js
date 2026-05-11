import DashboardLayout from '@/components/Layout/DashboardLayout';
import Head from 'next/head';

export default function Dashboard() {
  return (
    <DashboardLayout title="Tableau de Bord - Autorités">
      <Head>
        <title>USALAMA AI | Dashboard</title>
      </Head>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Map Area */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-h-[600px] flex flex-col relative shadow-lg shadow-black/20">
          <div className="absolute top-4 left-4 z-10 bg-gray-950/80 backdrop-blur border border-gray-800 p-2 rounded-lg">
            <h3 className="text-sm font-semibold text-white">Carte en direct</h3>
            <p className="text-xs text-gray-400">Vue globale des véhicules et incidents</p>
          </div>
          {/* Map Placeholder or Component will go here */}
          <div className="flex-1 flex items-center justify-center bg-gray-800/50">
            <span className="text-gray-500">Chargement de la carte Mapbox...</span>
          </div>
        </div>

        {/* Side Panel Area */}
        <div className="flex flex-col space-y-6">
          {/* Active Incidents */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
              Alertes Récentes
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium text-red-400">Accident de bus</h4>
                  <span className="text-xs text-gray-500">A l'instant</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Gombe, Boulevard du 30 Juin</p>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium text-orange-400">Mouvement suspect</h4>
                  <span className="text-xs text-gray-500">Il y a 5 min</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Limete, 1ème Rue</p>
              </div>
            </div>
          </div>

          {/* AI Predictions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg shadow-black/20 flex-1">
            <h3 className="text-lg font-semibold text-white mb-4">Prédictions IA</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-white">Zone Matete</span>
                  <span className="text-sm font-bold text-red-400">67% Risque</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
                <p className="text-xs text-gray-400">Heure critique : 18h-21h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
