const API_BASE_URL = '/api/v1';

export interface UserProfile {
  id: string;
  iin: string;
  phone_number: string;
  full_name: string;
  role: string;
  birth_date?: string;
  gender?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: UserProfile;
  };
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка сети или бэкенд сервера');
    }
    return data;
  }

  // --- Auth APIs ---
  public async login(phoneOrIin: string, password?: string): Promise<AuthResponse> {
    const payload = {
      phoneOrIin,
      password: password || 'password123',
    };
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async register(data: { iin: string; phone: string; full_name: string; password?: string }): Promise<AuthResponse> {
    const payload = {
      iin: data.iin,
      phone_number: data.phone,
      full_name: data.full_name,
      password: data.password || '123456a',
    };
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async getMe(): Promise<{ success: boolean; data: UserProfile }> {
    return this.request('/auth/me', { method: 'GET' });
  }

  // --- Grounds APIs ---
  public async getGrounds(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/grounds', { method: 'GET' });
  }

  // --- Bookings APIs ---
  public async getMyBookings(): Promise<{ success: boolean; data: { hosted?: any[]; joined?: any[] } }> {
    return this.request('/bookings/my', { method: 'GET' });
  }

  public async createBooking(payload: { ground_id: string; booking_date: string; start_time: string; end_time: string }): Promise<{ success: boolean; data: any; message?: string }> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async cancelBooking(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/bookings/${id}/cancel`, {
      method: 'POST',
    });
  }

  public async completeBooking(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/bookings/${id}/complete`, {
      method: 'POST',
    });
  }

  // --- Matchmaking APIs ---
  public async getOpenMatchmakingGames(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/matchmaking/open', { method: 'GET' });
  }

  public async requestJoinMatchmaking(bookingId: string): Promise<{ success: boolean; message?: string; data?: any }> {
    return this.request('/matchmaking/join-requests', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    });
  }

  public async approveJoinRequest(requestId: string): Promise<{ success: boolean; message?: string; data?: any }> {
    return this.request(`/matchmaking/join-requests/${requestId}/approve`, {
      method: 'POST',
    });
  }

  public async rejectJoinRequest(requestId: string): Promise<{ success: boolean; message?: string; data?: any }> {
    return this.request(`/matchmaking/join-requests/${requestId}/reject`, {
      method: 'POST',
    });
  }

  public async getHostRequests(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/bookings/requests', { method: 'GET' });
  }

  // --- Locks / Access Control APIs ---
  public async unlockDoor(payload: { bookingId?: string; qrCode?: string }): Promise<{ success: boolean; message?: string; data?: any }> {
    return this.request('/locks/unlock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
