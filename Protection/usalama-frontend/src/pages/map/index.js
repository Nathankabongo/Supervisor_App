import DashboardLayout from '@/components/Layout/DashboardLayout';
import Head from 'next/head';
import { Target, Radio } from 'lucide-react';

export default function TelecomMap() {
  return (
    <DashboardLayout title="Géolocalisation Télécom">
      <Head>
        <title>USALAMA AI | Carte Télécom</title>
      </Head>
      
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex-1 relative shadow-lg shadow-black/30">
          
          <div className="absolute top-6 left-6 z-10 bg-gray-950/80 backdrop-blur-md border border-gray-800 p-5 rounded-2xl w-80 shadow-2xl">
             <div className="flex items-center mb-4 text-white font-semibold text-sm border-b border-gray-800/50 pb-3">
                 <Target className="w-5 h-5 mr-3 text-blue-400" />
                 Triangulation GSM Locale
             </div>
             
             <div className="mb-4">
                 <p className="text-xs text-blue-300 font-medium mb-1">Cible :</p>
                 <p className="text-sm text-white font-mono bg-gray-900 py-1.5 px-3 rounded-md border border-gray-800">+243 81X XXX XXX</p>
             </div>
             
             <div className="mb-5">
                 <p className="text-xs text-orange-300 font-medium mb-1">Précision estimée :</p>
                 <p className="text-sm text-gray-300">Rayon de 50m à 100m.</p>
                 <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                     <div className="bg-orange-500 h-full w-[85%]"></div>
                 </div>
             </div>
             
             <div className="space-y-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
               <div className="flex items-center text-xs">
                 <span className="w-3 h-3 rounded-full border-2 border-emerald-500 mr-3 relative flex items-center justify-center">
                   <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                 </span>
                 <span className="text-gray-300 flex-1">Relais Gombe Nord</span>
                 <span className="text-emerald-400 font-mono">-48dBm</span>
               </div>
               <div className="flex items-center text-xs">
                 <span className="w-3 h-3 rounded-full border-2 border-emerald-500 mr-3 relative flex items-center justify-center">
                   <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                 </span>
                 <span className="text-gray-300 flex-1">Relais Lingwala Est</span>
                 <span className="text-emerald-400 font-mono">-62dBm</span>
               </div>
               <div className="flex items-center text-xs">
                 <span className="w-3 h-3 rounded-full border-2 border-yellow-500 mr-3 relative flex items-center justify-center">
                   <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                 </span>
                 <span className="text-gray-300 flex-1">Relais Kinshasa Ouest</span>
                 <span className="text-yellow-400 font-mono">-85dBm</span>
               </div>
             </div>
             
             <button className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center transition-colors">
                 <Radio className="w-4 h-4 mr-2" />
                 Rafraîchir Signal
             </button>
          </div>

          <div className="flex flex-col items-center justify-center w-full h-full bg-black/60 relative">
            <div className="absolute inset-0 grid-lines opacity-10"></div>
            <div className="w-32 h-32 border border-blue-500/30 rounded-full flex items-center justify-center animate-pulse relative">
                <div className="w-16 h-16 border-2 border-blue-500/50 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)]"></div>
                </div>
            </div>
            <p className="mt-4 text-xs text-blue-400/50 uppercase tracking-widest font-mono">Signal Fixé</p>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .grid-lines {
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}} />
    </DashboardLayout>
  );
}
