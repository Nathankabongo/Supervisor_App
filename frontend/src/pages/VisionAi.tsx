import { useState, useEffect } from 'react';
import { Camera, Eye } from 'lucide-react';
import apiService from '../services/api';

export default function VisionAi() {
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await apiService.getVisionCameras();
        if (res.cameras) setCameras(res.cameras);
      } catch (err) {
        console.error('Erreur chargement camération IA:', err);
      }
    };
    fetchCameras();
  }, []);

  return (
    <div className="p-4 space-y-4 bg-[#0f172a] min-h-screen text-slate-100">
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="text-cyan-400" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Vision par Ordinateur IA (Computer Vision AI)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Détection automatique du port des EPI, détection de fumée/incendie, personnes tombées & intrusions en zone interdite (Base SQLite)
          </p>
        </div>
        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs px-3 py-1 rounded-xl font-mono font-bold">
          {cameras.length} Caméras IA Actives
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cameras.map((c) => (
          <div key={c.id} className="bg-[#1e293b] rounded-2xl border border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-400 font-mono">{c.camera_code || c.id}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">{c.status}</span>
            </div>
            <div className="h-36 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <Eye size={32} className="text-slate-700 mb-1" />
              <span className="text-xs text-slate-400 font-semibold">{c.location}</span>
              <div className="absolute top-2 left-2 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" /> REC LIVE
              </div>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-slate-300 font-medium">Analyse IA : <span className="text-emerald-400">{c.ppe_status}</span></p>
              <p className="text-[10px] text-slate-400">Anomalies détectées : {c.anomalies_count} incident</p>
            </div>
          </div>
        ))}
        {cameras.length === 0 && (
          <div className="col-span-3 text-center py-6 text-slate-500 text-xs">Chargement des données vidéo SQLite...</div>
        )}
      </div>
    </div>
  );
}
