import { LayoutDashboard, Map, AlertTriangle, History, Route, FileText, Users, Settings, Server, Wifi, Mountain, Footprints, MessageSquare } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { t } from '../../i18n';

const navItemKeys = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', id: 'dashboard' },
  { icon: Map, labelKey: 'nav.map', id: 'map' },
  { icon: Mountain, labelKey: 'nav.extraction', id: 'extraction' },
  { icon: Footprints, labelKey: 'nav.traceability', id: 'traceability' },
  { icon: MessageSquare, labelKey: 'nav.communicate', id: 'communicate' },
  { icon: Users, labelKey: 'nav.miners', id: 'miners' },
  { icon: AlertTriangle, labelKey: 'nav.alerts', id: 'alerts' },
  { icon: History, labelKey: 'nav.history', id: 'history' },
  { icon: Route, labelKey: 'nav.trajectories', id: 'trajectories' },
  { icon: FileText, labelKey: 'nav.reports', id: 'reports' },
  { icon: Users, labelKey: 'nav.users', id: 'users' },
  { icon: Wifi, labelKey: 'nav.devices', id: 'devices' },
  { icon: Settings, labelKey: 'nav.settings', id: 'settings' },
  { icon: Server, labelKey: 'nav.system', id: 'system' },
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
  const activeAlerts = alerts.filter(a => !a.resolved).length;
  
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SU';
  const userName = user?.name || user?.username || 'Superviseur';
  const userRole = user?.role === 'supervisor' ? 'Superviseur' : user?.role || 'Superviseur';

  return (
    <div className="w-64 bg-[#1e293b] min-h-screen flex flex-col border-r border-gray-700">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <img src={`/LOGO.png`} alt="SupervisorApp" className="h-12 w-auto mx-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItemKeys.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const alertBadge = item.id === 'alerts' && activeAlerts > 0;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive
                  ? 'bg-green-500 text-white'
                  : 'text-gray-300 hover:bg-[#334155]'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left text-sm">{t(item.labelKey, language)}</span>
              {alertBadge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 mb-2 w-full hover:bg-[#334155] rounded p-1 transition-colors"
        >
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {userInitials}
          </div>
          <div className="text-left">
            <p className="text-white text-xs font-medium">{userName}</p>
            <p className="text-[10px] text-gray-400">{userRole}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 text-xs text-green-400 ml-11">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          {t('status.online', language)}
        </div>
      </div>

      {/* LoRa Network Status */}
      <div className="p-3 border-t border-gray-700 bg-[#334155]">
        <p className="text-[10px] text-gray-400 mb-1">ÉTAT DU RÉSEAU LORA</p>
        <div className="flex items-center gap-1 mb-1">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }}></div>
          </div>
          <span className="text-xs text-green-400">98%</span>
        </div>
        <p className="text-xs text-green-400">Bon</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Passerelles actives: 6</p>
        <div className="flex items-center gap-1 mt-1 text-gray-400">
          <Wifi size={12} />
          <span className="text-[10px]">Signal fort</span>
        </div>
      </div>
    </div>
  );
}
