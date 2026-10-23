import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Cpu, Server, CheckCircle2, Users } from 'lucide-react';
import apiService from '../services/api';

export default function SecurityCyber() {
  const navigate = useNavigate();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    apiService
      .verifyToken()
      .then((r) => setAuthOk(!!r.valid))
      .catch(() => setAuthOk(false));
    apiService
      .getUsers()
      .then((r) => setUserCount(r.users?.length || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Cybersécurité IT/OT & Protection Réseau</h1>
            <p className="text-xs text-slate-400 mt-0.5">État auth JWT réel + posture réseau déclarative (pas de SIEM branché)</p>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${
          authOk
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
            : authOk === false
              ? 'bg-red-950/60 text-red-300 border-red-800/40'
              : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}>
          <CheckCircle2 size={16} />
          {authOk === null ? 'Vérification…' : authOk ? 'Session JWT valide' : 'Session invalide'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Authentification MFA / JWT</span>
            <Lock size={18} className={authOk ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <p className="text-xl font-bold text-white">{authOk ? 'JWT Actif' : 'À vérifier'}</p>
          <p className="text-xs text-slate-400">Session signée avec expiration 24h (backend auth).</p>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Users size={12} /> {userCount} comptes · Gérer les utilisateurs
          </button>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Segmentation IT / OT</span>
            <Server size={18} className="text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white">Déclaratif</p>
          <p className="text-xs text-slate-400">Aucun agent OT/SIEM connecté — architecture cible documentée uniquement.</p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Chiffrement Données</span>
            <Cpu size={18} className="text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white">bcrypt + JWT</p>
          <p className="text-xs text-slate-400">Mots de passe hashés côté serveur ; TLS dépend du reverse-proxy de déploiement.</p>
        </div>
      </div>
    </div>
  );
}
