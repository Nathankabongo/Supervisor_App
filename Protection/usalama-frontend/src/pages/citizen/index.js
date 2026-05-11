import Head from 'next/head';
import SOSButton from '@/components/Citizen/SOSButton';
import { ShieldAlert, Map as MapIcon, ChevronRight } from 'lucide-react';

export default function CitizenModule() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center relative px-6 py-4">
      <Head>
        <title>USALAMA AI | Mode Citoyen</title>
      </Head>
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">USALAMA AI</h1>
        <div className="flex items-center bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            <span className="text-xs text-gray-300 font-medium">Connecté</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mt-6 flex flex-col">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-center shadow-lg">
           <h2 className="text-lg font-medium text-gray-200 mb-2">Une urgence ?</h2>
           <p className="text-sm text-gray-400 mb-6">Appuyez 3 secondes sur le bouton ci-dessous pour alerter les autorités discrètement.</p>
           
           <div className="flex justify-center my-4">
             <SOSButton />
           </div>
        </div>

        <div className="space-y-4 flex-1">
          <button className="w-full p-5 bg-gray-900 hover:bg-gray-800 rounded-2xl border border-gray-800 text-left transition-colors flex items-center shadow-lg group">
            <div className="bg-orange-500/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
                <span className="font-semibold text-white block mb-1">Signaler un Incident</span>
                <span className="text-xs text-gray-500">Vol, accident, agression...</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
          </button>
          
          <button className="w-full p-5 bg-gray-900 hover:bg-gray-800 rounded-2xl border border-gray-800 text-left transition-colors flex items-center shadow-lg group">
            <div className="bg-blue-500/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <MapIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
                <span className="font-semibold text-white block mb-1">Voir la Carte</span>
                <span className="text-xs text-gray-500">Consulter l'état de la ville en direct</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
          </button>
        </div>
        
        <div className="mt-8 mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start">
          <div className="mt-1 mr-3">
             <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-1">Sécurité & Confidentialité</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Vos alertes sont chiffrées de bout en bout et transmises instantanément à l'IA d'USALAMA. Mode silencieux activé.
              </p>
          </div>
        </div>
      </main>
    </div>
  );
}
