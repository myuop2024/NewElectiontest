import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService, type LoginCredentials, type RegisterData, type AuthResponse } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // For session-based auth, always try to get current user
      // The server will return 401 if not authenticated
      const userData = await authService.getCurrentUser();
      setUser(userData);
      // Store session marker for future checks
      localStorage.setItem("auth_token", "session-based");
    } catch (error) {
      // If we get 401, user is not authenticated - this is normal, don't log error
      if (error instanceof Error && error.message.includes('401')) {
        // Clear any stale auth markers
        localStorage.removeItem("auth_token");
        setUser(null);
      } else {
        // Only log non-401 errors as these indicate real problems
        console.error("Auth check failed:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authService.login(credentials);
      setUser(response.user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.firstName}!`,
      });
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authService.register(userData);
      setUser(response.user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${response.user.firstName}! Your observer ID is ${response.user.observerId}`,
      });
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout: async () => await logout(),
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}