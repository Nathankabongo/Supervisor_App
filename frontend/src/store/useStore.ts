import { create } from 'zustand';

export type MinerStatus = 'safe' | 'warning' | 'danger';
export type AlertType = 'fall' | 'immobility' | 'gas' | 'emergency';

export interface Position {
  x: number;
  y: number;
  timestamp: number;
}

export interface Miner {
  id: string;
  name: string;
  matricule: string;
  role: string;
  status: MinerStatus;
  currentZone: string;
  currentGallery: string;
  position: Position;
  trajectory: Position[];
  heartRate: number;
  activityLevel: number;
  battery?: number;
  connectionType?: 'lora' | 'wifi';
  toxicGasLevel?: number;
  seismicHz?: number;
  watchId?: string;
  isInService?: boolean;
  isUnderground?: boolean;
  phone?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  photo?: string;
  accountStatus?: string;
  zone?: string;
  temperature?: number;
  steps?: number;
  motion?: string;
}

export interface Alert {
  id: string;
  minerId?: string | null;
  minerName?: string | null;
  type: AlertType;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  resolved: boolean;
  message?: string;
  predictedCause?: string;
  zone?: string;
  source?: string;
  deviceId?: string | null;
  siren?: boolean;
  sirenConfirmed?: boolean;
  createdAt?: string;
  alertId?: string;
  status?: string;
}

export interface SirenLatencySample {
  n: number;
  alertId?: string | null;
  commandId?: string | null;
  createdAt?: string | null;
  apiToAppMs?: number | null;
  apiToEspMs?: number | null;
  gpioDelayUs?: number | null;
  appEspDeltaMs?: number | null;
  ntpSynced?: boolean | null;
}

export interface ZoneDeviceStatus {
  deviceId: string;
  zone: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string;
  lastSeen: string | null;
  siren: boolean;
  lastCommandId?: string | null;
  lastCommandStatus?: string | null;
  lastAction?: string | null;
  activeAlertId?: string | null;
}

export type TraceEventType =
  | 'entry'
  | 'exit'
  | 'zone_change'
  | 'alert'
  | 'rest'
  | 'equipment'
  | 'shift_start'
  | 'shift_end';

export interface TraceEvent {
  id: string;
  minerId: string;
  minerName: string;
  eventType: TraceEventType;
  zone: string;
  gallery: string;
  timestamp: number;
  details?: string;
  duration?: number; // minutes
}

export interface FilterState {
  zone: string;
  status: string;
  role: string;
  searchQuery: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: string;
  battery: number;
  fuel: number;
  engine_hours: number;
  operator: string;
  zone: string;
  is_autonomous: number;
  collision_risk: string;
}

export interface MaintenanceLog {
  id: string;
  machine_id: string;
  machine_name: string;
  type: string;
  risk_score: number;
  breakdown_date: string;
  component: string;
  status: string;
}

export interface EsgMetric {
  co2_emissions: number;
  water_usage: number;
  water_recycled: number;
  pm25: number;
  pm10: number;
  air_quality_status: string;
}

export interface GeotechSensor {
  id: string;
  zone: string;
  sensor_type: string;
  value: number;
  status: string;
  last_microseism_hz: number;
  dam_displacement_mm: number;
}

export interface AiPrediction {
  id: string;
  target: string;
  risk_percentage: number;
  estimated_timeframe: string;
  recommendation: string;
  category: string;
}

interface StoreState {
  miners: Miner[];
  alerts: Alert[];
  traceEvents: TraceEvent[];
  selectedMiner: Miner | null;
  filters: FilterState;
  showTrajectories: boolean;
  timelinePosition: number;
  isRealtime: boolean;
  liveToastAlert: Alert | null;
  zoneDevice: ZoneDeviceStatus | null;
  sirenLatencyRuns: SirenLatencySample[];
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
  esgMetrics: EsgMetric | null;
  geotechSensors: GeotechSensor[];
  aiPredictions: AiPrediction[];

  // Actions
  setMiners: (miners: Miner[]) => void;
  updateMiner: (id: string, updates: Partial<Miner>) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  setLiveToastAlert: (alert: Alert | null) => void;
  setZoneDevice: (status: ZoneDeviceStatus) => void;
  markAlertSirenConfirmed: (alertId: string | null | undefined, sirenOn?: boolean) => void;
  upsertSirenLatency: (sample: Partial<SirenLatencySample> & { alertId?: string | null; commandId?: string | null }) => void;
  resolveAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearAlerts: () => void;
  addTraceEvent: (event: TraceEvent) => void;
  setSelectedMiner: (miner: Miner | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setShowTrajectories: (show: boolean) => void;
  setTimelinePosition: (position: number) => void;
  setIsRealtime: (isRealtime: boolean) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setMaintenanceLogs: (logs: MaintenanceLog[]) => void;
  setEsgMetrics: (esg: EsgMetric) => void;
  setGeotechSensors: (sensors: GeotechSensor[]) => void;
  setAiPredictions: (predictions: AiPrediction[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  miners: [],
  alerts: [],
  traceEvents: [],
  selectedMiner: null,
  liveToastAlert: null,
  zoneDevice: null,
  sirenLatencyRuns: [],
  filters: {
    zone: 'all',
    status: 'all',
    role: 'all',
    searchQuery: '',
  },
  showTrajectories: true,
  timelinePosition: 100,
  isRealtime: true,
  vehicles: [],
  maintenanceLogs: [],
  esgMetrics: null,
  geotechSensors: [],
  aiPredictions: [],

  setMiners: (miners) => set({ miners }),

  updateMiner: (id, updates) =>
    set((state) => ({
      miners: state.miners.map((miner) => (miner.id === id ? { ...miner, ...updates } : miner)),
    })),

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) =>
    set((state) => {
      if (state.alerts.some((a) => a.id === alert.id)) {
        return state;
      }
      return { alerts: [alert, ...state.alerts] };
    }),

  setLiveToastAlert: (alert) => set({ liveToastAlert: alert }),

  setZoneDevice: (zoneDevice) => set({ zoneDevice }),

  markAlertSirenConfirmed: (alertId, sirenOn = true) =>
    set((state) => {
      const zoneDevice = state.zoneDevice
        ? { ...state.zoneDevice, siren: !!sirenOn, lastCommandStatus: 'EXECUTED' }
        : state.zoneDevice;
      if (!alertId) return { zoneDevice };
      return {
        zoneDevice,
        alerts: state.alerts.map((a) =>
          a.id === alertId
            ? { ...a, siren: !!sirenOn, sirenConfirmed: !!sirenOn }
            : a
        ),
      };
    }),

  upsertSirenLatency: (sample) =>
    set((state) => {
      const key = sample.alertId || sample.commandId;
      const runs = [...state.sirenLatencyRuns];
      const idx = key ? runs.findIndex((r) => r.alertId === sample.alertId || r.commandId === sample.commandId) : -1;
      const merged = {
        ...(idx >= 0 ? runs[idx] : { n: runs.length + 1 }),
        ...sample,
      };
      const apiToApp = merged.apiToAppMs;
      const apiToEsp = merged.apiToEspMs;
      merged.appEspDeltaMs =
        apiToApp != null && apiToEsp != null ? apiToEsp - apiToApp : merged.appEspDeltaMs ?? null;
      if (idx >= 0) {
        runs[idx] = merged as SirenLatencySample;
      } else {
        runs.push(merged as SirenLatencySample);
      }
      const trimmed = runs.slice(-10).map((r, i) => ({ ...r, n: i + 1 }));
      console.table(
        trimmed.map((r) => ({
          n: r.n,
          alertId: r.alertId,
          'API→App ms': r.apiToAppMs,
          'API→ESP32 ms': r.apiToEspMs,
          'ESP→GPIO us': r.gpioDelayUs,
          'App↔ESP ms': r.appEspDeltaMs,
          ntp: r.ntpSynced,
        })),
      );
      return { sirenLatencyRuns: trimmed };
    }),

  resolveAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) => (alert.id === id ? { ...alert, resolved: true } : alert)),
    })),

  deleteAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),

  clearAlerts: () => set({ alerts: [] }),

  addTraceEvent: (event) =>
    set((state) => ({
      traceEvents: [event, ...state.traceEvents].slice(0, 500),
    })),

  setSelectedMiner: (miner) => set({ selectedMiner: miner }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setShowTrajectories: (show) => set({ showTrajectories: show }),

  setTimelinePosition: (position) => set({ timelinePosition: position }),

  setIsRealtime: (isRealtime) => set({ isRealtime }),

  setVehicles: (vehicles) => set({ vehicles }),
  setMaintenanceLogs: (maintenanceLogs) => set({ maintenanceLogs }),
  setEsgMetrics: (esgMetrics) => set({ esgMetrics }),
  setGeotechSensors: (geotechSensors) => set({ geotechSensors }),
  setAiPredictions: (aiPredictions) => set({ aiPredictions }),
}));
