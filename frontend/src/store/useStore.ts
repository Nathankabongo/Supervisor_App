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
  minerId: string;
  minerName: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  resolved: boolean;
  message?: string;
  predictedCause?: string;
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

interface StoreState {
  miners: Miner[];
  alerts: Alert[];
  traceEvents: TraceEvent[];
  selectedMiner: Miner | null;
  filters: FilterState;
  showTrajectories: boolean;
  timelinePosition: number;
  isRealtime: boolean;

  // Actions
  setMiners: (miners: Miner[]) => void;
  updateMiner: (id: string, updates: Partial<Miner>) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  resolveAlert: (id: string) => void;
  addTraceEvent: (event: TraceEvent) => void;
  setSelectedMiner: (miner: Miner | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setShowTrajectories: (show: boolean) => void;
  setTimelinePosition: (position: number) => void;
  setIsRealtime: (isRealtime: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  miners: [],
  alerts: [],
  traceEvents: [],
  selectedMiner: null,
  filters: {
    zone: 'all',
    status: 'all',
    role: 'all',
    searchQuery: '',
  },
  showTrajectories: true,
  timelinePosition: 100,
  isRealtime: true,

  setMiners: (miners) => set({ miners }),

  updateMiner: (id, updates) =>
    set((state) => ({
      miners: state.miners.map((miner) => (miner.id === id ? { ...miner, ...updates } : miner)),
    })),

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
    })),

  resolveAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) => (alert.id === id ? { ...alert, resolved: true } : alert)),
    })),

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
}));
