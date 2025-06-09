import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  parishId: number;
  role?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    localStorage.setItem("auth_token", data.token);
    return data;
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    localStorage.setItem("auth_token", data.token);
    return data;
  }

  async getCurrentUser(): Promise<User> {
    if (!this.token) {
      throw new Error("No authentication token");
    }

    const response = await apiRequest("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get current user");
    }

    return response.json();
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authService = new AuthService();