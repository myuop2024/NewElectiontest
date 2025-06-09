import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

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
  phone: string;
  trn?: string;
  parishId: number;
  address: string;
  community?: string;
  latitude?: number;
  longitude?: number;
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
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Login failed");
    }

    const data = await response.json();
    // For session-based auth, we don't need to store tokens
    this.token = "session-based"; // Mark as authenticated
    localStorage.setItem("auth_token", "session-based");
    return { user: data.user, token: "session-based" };
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Registration failed");
    }

    const data = await response.json();
    // For session-based auth, we don't need to store tokens
    this.token = "session-based"; // Mark as authenticated
    localStorage.setItem("auth_token", "session-based");
    return { user: data.user, token: "session-based" };
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("401: Unauthorized");
      }
      throw new Error(`${response.status}: Failed to get current user`);
    }

    return response.json();
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem("auth_token");
    
    // Call server logout to clear session
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  isAuthenticated(): boolean {
    // For session-based auth, we can't reliably check without a server call
    // Return true if we have a stored token, but the real check happens in getCurrentUser
    return !!localStorage.getItem("auth_token");
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authService = new AuthService();