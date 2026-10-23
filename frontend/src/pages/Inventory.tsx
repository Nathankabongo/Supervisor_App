import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, QrCode, Watch, RefreshCw } from 'lucide-react';
import apiService from '../services/api';

export default function Inventory() {
  const navigate = useNavigate();
  const [watches, setWatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.getWatches();
      setWatches(res.watches || res || []);
    } catch (err) {
      console.error('Erreur inventaire montres:', err);
      setWatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assigned = watches.filter((w) => w.miner_id || w.matricule || w.assigned).length;
  const free = Math.max(0, watches.length - assigned);

  const items = [
    {
      id: 'INV-IOT',
      name: 'Montres T-Watch LoRa',
      cat: 'Équipements IoT',
      stock: watches.length || free,
      unit: 'unités en base',
      rfid: `${assigned} associées / ${free} libres`,
      action: () => navigate('/devices'),
      actionLabel: 'Gérer les montres',
    },
    {
      id: 'INV-EPI',
      name: 'Équipements de Protection (EPI)',
      cat: 'EPI',
      stock: null as number | null,
      unit: '',
      rfid: 'Pas de backend stock EPI',
      action: () => navigate('/human-safety'),
      actionLabel: 'Sécurité humaine',
      empty: true,
    },
    {
      id: 'INV-FLEET',
      name: 'Pièces & Engins (lien Flotte)',
      cat: 'Maintenance',
      stock: null as number | null,
      unit: '',
      rfid: 'Suivi via GMAO / Flotte',
      action: () => navigate('/maintenance'),
      actionLabel: 'Ouvrir GMAO',
      empty: true,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Box size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Gestion des Stocks & Équipements (RFID)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Inventaire dynamique des T-Watch ; les stocks EPI/carburant n&apos;ont pas encore d&apos;API dédiée
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono bg-slate-800 text-cyan-400 px-2 py-0.5 rounded font-bold">{item.id}</span>
              <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {item.id === 'INV-IOT' ? <Watch size={12} /> : <QrCode size={12} />} {item.rfid}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{item.name}</h3>
            <p className="text-xs text-slate-400">Catégorie: <strong className="text-slate-200">{item.cat}</strong></p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{item.empty ? 'Statut:' : 'En Stock:'}</span>
              {item.empty ? (
                <span className="text-xs font-bold text-amber-400">Non câblé (pas d&apos;API)</span>
              ) : (
                <span className="text-xl font-black text-cyan-400">
                  {item.stock} {item.unit}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={item.action}
              className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold"
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
