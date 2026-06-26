const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_URL = import.meta.env.VITE_API_URL || `http://${host}:5000/api`;

interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  user: {
    userId: number;
    username: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
  };
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || `Erreur ${response.status}`);
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signup(username: string, password: string, name: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async verifyToken(): Promise<VerifyResponse> {
    return this.request<VerifyResponse>('/auth/verify');
  }

  async getHealth(): Promise<{ status: string; message: string }> {
    return this.request('/health');
  }

  async getLoraStatus(): Promise<any> {
    return this.request('/lora/status');
  }

  async getLoraGateways(): Promise<any> {
    return this.request('/lora/gateways');
  }

  async getSerialPorts(): Promise<any> {
    return this.request('/lora/ports');
  }

  async scanLoraDevices(): Promise<any> {
    return this.request('/lora/scan', { method: 'POST' });
  }

  async connectLoraDevice(deviceId: string, name?: string): Promise<any> {
    return this.request('/lora/connect', {
      method: 'POST',
      body: JSON.stringify({ deviceId, name }),
    });
  }

  async disconnectLoraDevice(deviceId: string): Promise<any> {
    return this.request('/lora/disconnect', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
  }


  async sendLoraCommand(deviceId: string, command: string): Promise<any> {
    return this.request('/lora/command', {
      method: 'POST',
      body: JSON.stringify({ deviceId, command }),
    });
  }

  // === Messages ===

  async sendMessage(
    content: string,
    type: 'text' | 'voice',
    recipientMode: 'all' | 'zone' | 'miner',
    targets: string[],
  ): Promise<any> {
    return this.request('/data/messages/send', {
      method: 'POST',
      body: JSON.stringify({ content, type, recipientMode, targets }),
    });
  }

  async getMessages(limit = 50, offset = 0): Promise<any> {
    return this.request(`/data/messages?limit=${limit}&offset=${offset}`);
  }

  async getMessageStatus(messageId: string): Promise<any> {
    return this.request(`/data/messages/${messageId}`);
  }

  async getAlerts(): Promise<any> {
    return this.request('/data/alerts');
  }

  async resolveAlert(alertId: string): Promise<any> {
    return this.request(`/data/alerts/${alertId}/resolve`, { method: 'POST' });
  }

  // === Extractions ===
  async getExtractions(): Promise<any> {
    return this.request('/data/extractions');
  }

  // === System & Users ===
  async getSystemStats(): Promise<any> {
    return this.request('/data/system/stats');
  }

  async getUsers(): Promise<any> {
    return this.request('/data/users');
  }

  // === Traçabilité ===

  async getTraceEvents(filters?: {
    minerId?: string;
    zone?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.minerId) params.set('minerId', filters.minerId);
    if (filters?.zone) params.set('zone', filters.zone);
    if (filters?.eventType) params.set('eventType', filters.eventType);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request(`/data/trace/events${qs ? `?${qs}` : ''}`);
  }

  async addTraceEvent(event: {
    minerId: string;
    minerName: string;
    eventType: string;
    zone: string;
    gallery?: string;
    details?: string;
    duration?: number;
  }): Promise<any> {
    return this.request('/data/trace/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async getTraceStats(): Promise<any> {
    return this.request('/data/trace/stats');
  }

  // === Conditions Environnementales ===

  async getEnvConditions(): Promise<any> {
    return this.request('/data/env');
  }

  async getEnvCondition(zone: string): Promise<any> {
    return this.request(`/data/env/${encodeURIComponent(zone)}`);
  }

  async updateEnvCondition(data: {
    zone: string;
    temperature?: number;
    humidity?: number;
    co2_level?: number;
    dust_level?: number;
    noise_level?: number;
    wind_speed?: number;
    pressure?: number;
    status?: string;
  }): Promise<any> {
    return this.request('/data/env/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // === Mineurs (DB) ===

  async getMiners(): Promise<any> {
    return this.request('/data/miners');
  }

  async addMiner(data: {
    name: string;
    role: string;
    phone?: string;
    emergency_contact?: string;
    blood_group?: string;
    zone?: string;
  }): Promise<any> {
    return this.request('/data/miners', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMiner(
    id: string,
    data: {
      zone?: string;
      gallery?: string;
      status?: string;
      heart_rate?: number;
      temperature?: number;
      battery?: number;
      x?: number;
      y?: number;
      phone?: string;
      emergency_contact?: string;
      blood_group?: string;
      account_status?: string;
      name?: string;
      role?: string;
    },
  ): Promise<any> {
    return this.request(`/data/miners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMiner(id: string): Promise<any> {
    return this.request(`/data/miners/${id}`, {
      method: 'DELETE',
    });
  }

  // === Watches ===

  async getWatches(): Promise<any> {
    return this.request('/data/watches');
  }

  async createWatch(watchId: string): Promise<any> {
    return this.request('/data/watches', {
      method: 'POST',
      body: JSON.stringify({ watchId }),
    });
  }

  async associateDevice(matricule: string, watchId: string): Promise<any> {
    return this.request('/data/devices/associate', {
      method: 'POST',
      body: JSON.stringify({ matricule, watchId }),
    });
  }

  async dissociateDevice(watchId: string): Promise<any> {
    return this.request('/data/devices/dissociate', {
      method: 'POST',
      body: JSON.stringify({ watchId }),
    });
  }

  // === Access Control ===

  async toggleAccessControl(data: {
    minerId: string;
    action: 'entry' | 'exit';
    zone: string;
    responsible?: string;
  }): Promise<any> {
    return this.request('/data/trace/access-control', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGateways(): Promise<any> {
    return this.request('/data/gateways');
  }

  // === GIS Configuration ===
  async getGisConfig(): Promise<any> {
    return this.request('/gis');
  }

  async updateGisConfig(config: any): Promise<any> {
    return this.request('/gis', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export default apiService;
