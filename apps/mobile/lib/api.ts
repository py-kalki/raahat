const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data as T;
  }

  // Auth
  async login(phone: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(body: any) {
    const data = await this.request<{ token: string; user: any; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Officers
  async setDutyStatus(onDuty: boolean) {
    return this.request<{ message: string; onDuty: boolean }>('/officers/me/duty', {
      method: 'PATCH',
      body: JSON.stringify({ onDuty }),
    });
  }

  async sendOfficerLocation(lat: number, lng: number) {
    return this.request<{ success: boolean }>('/officers/me/location', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  }

  async acknowledgeAlert(alertId: string) {
    return this.request<any>(`/officers/alerts/${alertId}/ack`, {
      method: 'POST',
    });
  }

  // Trips
  async createTrip(pickup: any, drop: any, vehicleNumber?: string) {
    return this.request<{ message: string; trip: any }>('/trips', {
      method: 'POST',
      body: JSON.stringify({ pickup, drop, vehicleNumber }),
    });
  }

  async getActiveTrip() {
    return this.request<any>('/trips/active');
  }

  async endTrip(tripId: string) {
    return this.request<{ message: string; trip: any }>(`/trips/${tripId}/end`, {
      method: 'PATCH',
    });
  }

  async cancelTrip(tripId: string) {
    return this.request<{ message: string; trip: any }>(`/trips/${tripId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Admin
  async getAdminOverview() {
    return this.request<{ activeTrips: any[]; onDutyOfficers: any[] }>('/admin/overview');
  }

  async getAdminUsers(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/admin/users${query}`);
  }

  async verifyUser(userId: string, status: 'APPROVED' | 'REJECTED') {
    return this.request<any>(`/admin/users/${userId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async registerPushToken(token: string) {
    return this.request<{ success: boolean; message: string }>('/devices/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}

export const api = new ApiClient();
export { API_BASE };
