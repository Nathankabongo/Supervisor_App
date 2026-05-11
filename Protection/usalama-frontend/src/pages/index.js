import Head from 'next/head';
import Link from 'next/link';
import { ShieldAlert, Shield, Map as MapIcon, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans relative overflow-hidden">
      <Head>
        <title>USALAMA AI | Sécurité Intelligente</title>
      </Head>
      
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="mb-8 p-4 rounded-3xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 shadow-2xl backdrop-blur-sm">
           <Shield className="w-16 h-16 text-blue-400" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-6 text-center tracking-tight">
          USALAMA AI
        </h1>
        
        <p className="max-w-xl text-center text-lg md:text-xl text-gray-400 mb-14 leading-relaxed">
          Le système de surveillance et de sécurité urbaine alimenté par l'intelligence artificielle pour une ville plus sûre.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/dashboard" className="group relative p-[1px] rounded-3xl bg-gradient-to-b from-gray-700 to-gray-900 hover:from-blue-600 hover:to-indigo-600 transition-all duration-500 shadow-xl shadow-black/50 hover:shadow-blue-500/20">
             <div className="h-full bg-gray-950 p-8 rounded-[23px] flex flex-col justify-between group-hover:bg-gray-900/80 transition-colors">
               <div className="mb-8">
                 <ShieldAlert className="w-10 h-10 text-blue-400 mb-5 group-hover:scale-110 transition-transform duration-300" />
                 <h2 className="text-2xl font-bold text-white mb-3">Accès Autorités</h2>
                 <p className="text-sm text-gray-400 leading-relaxed">Gérez les incidents en temps réel, surveillez les flux urbains et déployez les agents de sécurité sur le terrain.</p>
               </div>
               <div className="flex items-center text-blue-400 font-semibold text-sm tracking-wide uppercase">
                 Connexion <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-2 transition-transform duration-300" />
               </div>
             </div>
          </Link>

          <Link href="/citizen" className="group relative p-[1px] rounded-3xl bg-gradient-to-b from-gray-700 to-gray-900 hover:from-emerald-600 hover:to-teal-600 transition-all duration-500 shadow-xl shadow-black/50 hover:shadow-emerald-500/20">
             <div className="h-full bg-gray-950 p-8 rounded-[23px] flex flex-col justify-between group-hover:bg-gray-900/80 transition-colors">
               <div className="mb-8">
                 <MapIcon className="w-10 h-10 text-emerald-400 mb-5 group-hover:scale-110 transition-transform duration-300" />
                 <h2 className="text-2xl font-bold text-white mb-3">Portail Citoyen</h2>
                 <p className="text-sm text-gray-400 leading-relaxed">Signalez des incidents discrètement, alertez les autorités et suivez l'état de sécurité de la ville.</p>
               </div>
               <div className="flex items-center text-emerald-400 font-semibold text-sm tracking-wide uppercase">
                 Entrer <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-2 transition-transform duration-300" />
               </div>
             </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
