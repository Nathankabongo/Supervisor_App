import { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  Server,
  Wifi,
  Mountain,
  MessageSquare,
  Cpu,
  MapPin,
  Truck,
  Wrench,
  Leaf,
  Activity,
  Box,
  Brain,
  Bomb,
  Glasses,
  Navigation,
  ShieldCheck,
  Building,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  Zap,
  Droplets,
  CloudSun,
  Camera,
  Siren,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { t } from '../../i18n';

interface NavGroup {
  id: string;
  title: string;
  icon: any;
  items: { icon: any; labelKey: string; id: string }[];
}

const navGroups: NavGroup[] = [
  {
    id: 'human-safety-group',
    title: 'Capital Humain & HSE',
    icon: HeartPulse,
    items: [
      { icon: HeartPulse, labelKey: 'nav.human-safety', id: 'human-safety' },
      { icon: Users, labelKey: 'nav.miners', id: 'miners' },
      { icon: AlertTriangle, labelKey: 'nav.alerts', id: 'alerts' },
      { icon: MapPin, labelKey: 'nav.localisation', id: 'localisation' },
      { icon: MessageSquare, labelKey: 'nav.communicate', id: 'communicate' },
    ],
  },
  {
    id: 'operations',
    title: 'Flotte & Dispatch',
    icon: Truck,
    items: [
      { icon: Truck, labelKey: 'nav.fleet', id: 'fleet' },
      { icon: Cpu, labelKey: 'nav.dispatch', id: 'dispatch' },
      { icon: Bomb, labelKey: 'nav.blasting', id: 'blasting' },
      { icon: Navigation, labelKey: 'nav.drone', id: 'drone' },
      { icon: Cpu, labelKey: 'nav.watchLogs', id: 'watch-logs' },
    ],
  },
  {
    id: 'production',
    title: 'Production & Géosciences',
    icon: Mountain,
    items: [
      { icon: Mountain, labelKey: 'nav.extraction', id: 'extraction' },
      { icon: Activity, labelKey: 'nav.geotech', id: 'geotech' },
      { icon: Box, labelKey: 'nav.digital-twin', id: 'digital-twin' },
      { icon: MapPin, labelKey: 'nav.gis-config', id: 'gis-config' },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance & IA',
    icon: Wrench,
    items: [
      { icon: Wrench, labelKey: 'nav.maintenance', id: 'maintenance' },
      { icon: Brain, labelKey: 'nav.ai', id: 'ai' },
      { icon: Camera, labelKey: 'nav.vision-ai', id: 'vision-ai' },
    ],
  },
  {
    id: 'esg',
    title: 'Environnement & Énergie',
    icon: Leaf,
    items: [
      { icon: Leaf, labelKey: 'nav.esg', id: 'esg' },
      { icon: Zap, labelKey: 'nav.energy', id: 'energy' },
      { icon: Droplets, labelKey: 'nav.water', id: 'water' },
      { icon: CloudSun, labelKey: 'nav.weather', id: 'weather' },
    ],
  },
  {
    id: 'crisis',
    title: 'Sécurité & Crise',
    icon: Siren,
    items: [
      { icon: Siren, labelKey: 'nav.crisis-center', id: 'crisis-center' },
      { icon: ShieldCheck, labelKey: 'nav.security-cyber', id: 'security-cyber' },
    ],
  },
  {
    id: 'gestion',
    title: 'Gouvernance & Direction',
    icon: Building,
    items: [
      { icon: TrendingUp, labelKey: 'nav.director-dashboard', id: 'director-dashboard' },
      { icon: Building, labelKey: 'nav.erp', id: 'erp' },
      { icon: Box, labelKey: 'nav.inventory', id: 'inventory' },
      { icon: Glasses, labelKey: 'nav.ar-vr', id: 'ar-vr' },
      { icon: FileText, labelKey: 'nav.reports', id: 'reports' },
      { icon: Users, labelKey: 'nav.users', id: 'users' },
      { icon: Wifi, labelKey: 'nav.devices', id: 'devices' },
      { icon: Settings, labelKey: 'nav.settings', id: 'settings' },
      { icon: Server, labelKey: 'nav.system', id: 'system' },
    ],
  },
];

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout?: () => void;
}

export default function Sidebar({ currentPage, onPageChange, onLogout }: SidebarProps) {
  const { alerts } = useStore();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  // Track expanded accordion categories (all open by default for quick access)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'human-safety-group': true,
    operations: true,
    production: true,
    maintenance: true,
    esg: true,
    crisis: true,
    gestion: true,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SU';
  const userName = user?.name || user?.username || 'Superviseur';
  const userRole = user?.role === 'supervisor' ? 'Superviseur' : user?.role || 'Superviseur';

  return (
    <div className="w-64 bg-[#1e293b] h-screen flex flex-col border-r border-slate-800/80 overflow-hidden shrink-0 select-none">
      {/* Logo Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0 flex items-center justify-center">
        <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
      </div>

      {/* Navigation Groups / Accordion Buttons */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        {/* Standalone Primary Dashboard Button */}
        <button
          onClick={() => onPageChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-black uppercase tracking-wider ${
            currentPage === 'dashboard'
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
              : 'bg-slate-900/60 text-slate-200 border border-slate-800/60 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} className={currentPage === 'dashboard' ? 'text-white' : 'text-emerald-400'} />
          <span className="flex-1 text-left truncate">{t('nav.dashboard', language)}</span>
        </button>

        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = !!openCategories[group.id];
          const hasActiveChild = group.items.some((item) => item.id === currentPage);
          const groupAlerts = group.id === 'hse' ? activeAlerts : 0;

          return (
            <div key={group.id} className="rounded-xl overflow-hidden border border-slate-800/40 bg-slate-900/30">
              {/* Category Button Header */}
              <button
                onClick={() => toggleCategory(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-all duration-200 ${
                  hasActiveChild
                    ? 'bg-slate-800/90 text-emerald-400 border-l-2 border-emerald-500'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GroupIcon size={16} className={hasActiveChild ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="uppercase tracking-wider font-black truncate">{group.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {groupAlerts > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                      {groupAlerts}
                    </span>
                  )}
                  {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                </div>
              </button>

              {/* Sub-pages Accordion Panel */}
              {isOpen && (
                <div className="p-1 space-y-0.5 bg-slate-900/60 border-t border-slate-800/40">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    const alertBadge = item.id === 'alerts' && activeAlerts > 0;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onPageChange(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 text-xs font-medium ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold border-l-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                        <span className="flex-1 text-left truncate">{t(item.labelKey, language)}</span>
                        {alertBadge && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                            {activeAlerts}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full hover:bg-slate-800/60 rounded-xl p-2 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-black shadow-inner shrink-0">
            {userInitials}
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-white text-xs font-bold truncate group-hover:text-emerald-400 transition-colors">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate">{userRole}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        </button>
      </div>

      {/* LoRa Network Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Wifi size={12} className="text-emerald-400" /> Réseau LoRa & 5G
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400">98% ONLINE</span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98%' }}></div>
        </div>
        <p className="text-[10px] text-slate-400">6 Passerelles LoRa • 5G Privée active</p>
      </div>
    </div>
  );
}
