import { Bell, Sun, Moon, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Topbar() {
  const navigate = useNavigate();
  const { alerts } = useStore();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="h-14 bg-[#1e293b] border-b border-gray-700 flex items-center justify-between px-4">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <MapPin size={20} className="text-green-500" />
        <h2 className="text-base font-semibold text-white">Vue Globale du Site - Temps Réel</h2>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Alert Bell */}
        <button
          type="button"
          title="Voir les alertes"
          onClick={() => navigate('/alerts')}
          className="relative p-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <Bell size={20} />
          {activeAlerts > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {activeAlerts}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Site Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#334155] rounded">
          <MapPin size={14} className="text-green-500" />
          <span className="text-white text-xs font-medium">Site Principal</span>
        </div>
      </div>
    </div>
  );
}
