import Head from 'next/head';
import { Target, Shield, Navigation } from 'lucide-react';

export default function AgentModule() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col relative px-4 py-6 font-sans">
      <Head>
        <title>USALAMA AI | Agent / Chauffeur</title>
      </Head>
      
      {/* Header Info (Locked) */}
      <header className="flex justify-between items-center mb-6 pt-2 pb-4 px-2 border-b border-gray-800">
         <div className="flex items-center">
            <div className="bg-blue-600 p-2.5 rounded-xl mr-4 shadow-lg shadow-blue-500/30">
               <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
               <h1 className="font-bold text-lg leading-tight tracking-wide text-gray-100">Agent Alpha-1</h1>
               <p className="text-xs text-blue-400 font-mono tracking-wider mt-0.5">ID: SEC-8942-X</p>
            </div>
         </div>
         <div className="text-right flex flex-col items-end">
             <div className="flex items-center justify-end mb-1 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                 <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></span>
                 <span className="text-xs font-semibold text-green-400 tracking-wide uppercase">En Service</span>
             </div>
             <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-1">GPS Lock: ON</p>
         </div>
      </header>

      {/* Map Area */}
      <main className="flex-1 rounded-3xl overflow-hidden relative border border-gray-800 shadow-2xl bg-gray-900 group">
         {/* Map Placeholder */}
         <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #60a5fa 1.5px, transparent 1.5px)', backgroundSize: '24px 24px'}}></div>
            <div className="relative z-10 flex flex-col items-center group-hover:scale-105 transition-transform duration-700">
              <div className="bg-blue-500/10 p-4 rounded-full mb-4 ring-1 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <Navigation className="w-10 h-10 text-blue-400 animate-pulse" />
              </div>
              <p className="text-sm text-blue-400/80 font-medium tracking-wide">Acquisition du signal GPS...</p>
            </div>
         </div>

         {/* Floating Overlay Info */}
         <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[92%] bg-gray-950/90 backdrop-blur-xl rounded-[20px] border border-gray-800 p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Position Actuelle</span>
                <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-base font-bold text-white mb-1">Avenue de la Justice</p>
                  <p className="text-xs text-gray-400 font-medium">Gombe, Kinshasa</p>
               </div>
               <div className="text-right bg-gray-900 px-3 py-2 rounded-lg border border-gray-800">
                  <p className="text-[11px] text-blue-400 font-mono tracking-widest mb-1 opacity-80">4.3162° S</p>
                  <p className="text-[11px] text-blue-400 font-mono tracking-widest opacity-80">15.3121° E</p>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}
