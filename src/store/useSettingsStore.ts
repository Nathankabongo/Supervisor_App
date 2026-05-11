import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type LanguageCode = 'fr' | 'en' | 'sw' | 'ln' | 'lu' | 'kg';

export interface AppSettings {
  theme: ThemeMode;
  language: LanguageCode;
  notifications: boolean;
  soundAlerts: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  mapStyle: 'standard' | 'satellite' | 'terrain';
  compactMode: boolean;
  showZones: boolean;
  showGateways: boolean;
  distanceUnit: 'meters' | 'feet';
  temperatureUnit: 'celsius' | 'fahrenheit';
}

interface SettingsState extends AppSettings {
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: LanguageCode) => void;
  setNotifications: (enabled: boolean) => void;
  setSoundAlerts: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setMapStyle: (style: 'standard' | 'satellite' | 'terrain') => void;
  setCompactMode: (enabled: boolean) => void;
  setShowZones: (show: boolean) => void;
  setShowGateways: (show: boolean) => void;
  setDistanceUnit: (unit: 'meters' | 'feet') => void;
  setTemperatureUnit: (unit: 'celsius' | 'fahrenheit') => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('app_settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    theme: 'dark',
    language: 'fr',
    notifications: true,
    soundAlerts: true,
    autoRefresh: true,
    refreshInterval: 5,
    mapStyle: 'standard',
    compactMode: false,
    showZones: true,
    showGateways: true,
    distanceUnit: 'meters',
    temperatureUnit: 'celsius',
  };
};

const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  } catch {}
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),

  setTheme: (theme) => {
    set({ theme });
    saveSettings(get());
    document.documentElement.setAttribute('data-theme', theme);
  },

  setLanguage: (language) => {
    set({ language });
    saveSettings(get());
  },

  setNotifications: (notifications) => {
    set({ notifications });
    saveSettings(get());
  },

  setSoundAlerts: (soundAlerts) => {
    set({ soundAlerts });
    saveSettings(get());
  },

  setAutoRefresh: (autoRefresh) => {
    set({ autoRefresh });
    saveSettings(get());
  },

  setRefreshInterval: (refreshInterval) => {
    set({ refreshInterval });
    saveSettings(get());
  },

  setMapStyle: (mapStyle) => {
    set({ mapStyle });
    saveSettings(get());
  },

  setCompactMode: (compactMode) => {
    set({ compactMode });
    saveSettings(get());
  },

  setShowZones: (showZones) => {
    set({ showZones });
    saveSettings(get());
  },

  setShowGateways: (showGateways) => {
    set({ showGateways });
    saveSettings(get());
  },

  setDistanceUnit: (distanceUnit) => {
    set({ distanceUnit });
    saveSettings(get());
  },

  setTemperatureUnit: (temperatureUnit) => {
    set({ temperatureUnit });
    saveSettings(get());
  },

  updateSettings: (partial) => {
    set(partial);
    saveSettings(get());
    if (partial.theme) {
      document.documentElement.setAttribute('data-theme', partial.theme);
    }
  },
}));
