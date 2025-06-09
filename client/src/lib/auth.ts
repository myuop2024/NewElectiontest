import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  trn?: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    observerId: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
}

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('caffe_auth_token');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    const data = await response.json();
    
    this.setToken(data.token);
    return data;
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    const data = await response.json();
    
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
      }
      throw new Error('Failed to get current user');
    }

    return response.json();
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('caffe_auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('caffe_auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
}

export const authService = AuthService.getInstance();
