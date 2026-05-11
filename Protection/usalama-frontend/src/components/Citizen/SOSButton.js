import { AlertTriangle } from 'lucide-react';

export default function SOSButton() {
  return (
    <button className="flex flex-col items-center justify-center w-36 h-36 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 active:from-red-700 active:to-red-900 text-white rounded-full shadow-2xl shadow-red-600/50 transition-all transform hover:scale-105 active:scale-95 border-4 border-red-400">
      <AlertTriangle className="w-14 h-14 mb-2 animate-pulse text-white" />
      <span className="font-bold text-2xl tracking-wider leading-none">SOS</span>
      <span className="text-sm mt-1 text-red-100 font-medium">Urgence</span>
    </button>
  );
}
