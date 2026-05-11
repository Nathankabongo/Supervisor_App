import { Bell, Shield, Monitor, Moon, Sun, Save, Wifi, Globe, Ruler, Thermometer, CheckCircle } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { t, LANGUAGES } from '../i18n';
import type { LanguageCode } from '../store/useSettingsStore';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { language } = settings;

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-600'} relative`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('settings.title', language)}</h1>
          <p className="text-sm text-gray-400">Configuration de l'application</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-xs text-green-400">Sauvegarde automatique</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={18} className="text-green-400" />
            <h3 className="text-sm font-medium text-white">{t('settings.notifications', language)}</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{t('settings.pushAlerts', language)}</p>
              <p className="text-gray-400 text-xs">Recevoir les alertes en temps réel</p>
            </div>
            <Toggle enabled={settings.notifications} onChange={() => settings.setNotifications(!settings.notifications)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{t('settings.soundAlerts', language)}</p>
              <p className="text-gray-400 text-xs">Son pour les alertes critiques</p>
            </div>
            <Toggle enabled={settings.soundAlerts} onChange={() => settings.setSoundAlerts(!settings.soundAlerts)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{t('settings.autoRefresh', language)}</p>
              <p className="text-gray-400 text-xs">Mise à jour automatique des données</p>
            </div>
            <Toggle enabled={settings.autoRefresh} onChange={() => settings.setAutoRefresh(!settings.autoRefresh)} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{t('settings.refreshInterval', language)}</p>
            <select
              value={settings.refreshInterval}
              onChange={(e) => settings.setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={18} className="text-blue-400" />
            <h3 className="text-sm font-medium text-white">{t('settings.appearance', language)}</h3>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{t('settings.theme', language)}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => settings.setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${settings.theme === 'dark' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                <Moon size={12} /> {t('settings.dark', language)}
              </button>
              <button
                onClick={() => settings.setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${settings.theme === 'light' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                <Sun size={12} /> {t('settings.light', language)}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{t('settings.language', language)}</p>
            <select
              value={settings.language}
              onChange={(e) => settings.setLanguage(e.target.value as LanguageCode)}
              className="px-3 py-1 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
            >
              {Object.entries(LANGUAGES).map(([code, info]) => (
                <option key={code} value={code}>{info.flag} {info.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{t('settings.mapStyle', language)}</p>
            <select
              value={settings.mapStyle}
              onChange={(e) => settings.setMapStyle(e.target.value as 'standard' | 'satellite' | 'terrain')}
              className="px-3 py-1 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="standard">Standard</option>
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{t('settings.compactMode', language)}</p>
            <Toggle enabled={settings.compactMode} onChange={() => settings.setCompactMode(!settings.compactMode)} />
          </div>
        </div>

        {/* National Languages */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-amber-400" />
            <h3 className="text-sm font-medium text-white">🇨🇩 Langues Nationales Congolaises</h3>
          </div>
          <div className="space-y-2">
            {[
              { code: 'sw' as LanguageCode, name: 'Kiswahili', desc: 'Langue nationale - Est du pays', flag: '🇨🇩' },
              { code: 'ln' as LanguageCode, name: 'Lingála', desc: 'Langue nationale - Nord-Ouest', flag: '🇨🇩' },
              { code: 'lu' as LanguageCode, name: 'Tshiluba', desc: 'Langue nationale - Centre-Kasaï', flag: '🇨🇩' },
              { code: 'kg' as LanguageCode, name: 'Kikongo', desc: 'Langue nationale - Bas-Congo', flag: '🇨🇩' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => settings.setLanguage(lang.code)}
                className={`w-full flex items-center justify-between p-3 rounded border transition-colors ${
                  settings.language === lang.code
                    ? 'bg-green-500/20 border-green-500'
                    : 'bg-[#0b1a2a] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{lang.name}</p>
                    <p className="text-gray-400 text-[10px]">{lang.desc}</p>
                  </div>
                </div>
                {settings.language === lang.code && (
                  <CheckCircle size={16} className="text-green-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Units & Measurements */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Ruler size={18} className="text-purple-400" />
            <h3 className="text-sm font-medium text-white">Unités & Mesures</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler size={14} className="text-gray-400" />
              <p className="text-white text-sm">{t('settings.distanceUnit', language)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => settings.setDistanceUnit('meters')}
                className={`px-3 py-1 rounded text-xs ${settings.distanceUnit === 'meters' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                Mètres
              </button>
              <button
                onClick={() => settings.setDistanceUnit('feet')}
                className={`px-3 py-1 rounded text-xs ${settings.distanceUnit === 'feet' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                Pieds
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer size={14} className="text-gray-400" />
              <p className="text-white text-sm">{t('settings.tempUnit', language)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => settings.setTemperatureUnit('celsius')}
                className={`px-3 py-1 rounded text-xs ${settings.temperatureUnit === 'celsius' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                °C
              </button>
              <button
                onClick={() => settings.setTemperatureUnit('fahrenheit')}
                className={`px-3 py-1 rounded text-xs ${settings.temperatureUnit === 'fahrenheit' ? 'bg-green-500 text-white' : 'bg-[#334155] text-gray-300'}`}
              >
                °F
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Afficher zones</p>
              <p className="text-gray-400 text-xs">Zones sur la carte</p>
            </div>
            <Toggle enabled={settings.showZones} onChange={() => settings.setShowZones(!settings.showZones)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Afficher passerelles</p>
              <p className="text-gray-400 text-xs">Gateways LoRa sur la carte</p>
            </div>
            <Toggle enabled={settings.showGateways} onChange={() => settings.setShowGateways(!settings.showGateways)} />
          </div>
        </div>

        {/* Security */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-orange-400" />
            <h3 className="text-sm font-medium text-white">{t('settings.security', language)}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Authentification 2FA</p>
                <p className="text-gray-400 text-xs">Double authentification requise</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Activé</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Durée de session</p>
                <p className="text-gray-400 text-xs">Expiration automatique</p>
              </div>
              <span className="text-gray-300 text-sm">8 heures</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Dernière connexion</p>
                <p className="text-gray-400 text-xs">Adresse IP et heure</p>
              </div>
              <span className="text-gray-300 text-xs">192.168.1.10 - 03:00</span>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="bg-[#1e293b] rounded border border-gray-700 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi size={18} className="text-cyan-400" />
            <h3 className="text-sm font-medium text-white">{t('settings.network', language)}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Passerelles actives</p>
                <p className="text-gray-400 text-xs">Connexion des points d'accès</p>
              </div>
              <span className="text-green-400 text-sm font-bold">6/6</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Qualité du signal</p>
                <p className="text-gray-400 text-xs">Force du réseau LoRa</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }} />
                </div>
                <span className="text-green-400 text-xs">98%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Fréquence</p>
                <p className="text-gray-400 text-xs">Canal de communication</p>
              </div>
              <span className="text-gray-300 text-sm">868 MHz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
