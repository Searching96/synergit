/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUsername: string;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getUsernameFromToken(token: string | null): string {
  if (!token) return '';

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return '';

    const normalizedBase64 = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payloadJson = atob(normalizedBase64);
    const payload = JSON.parse(payloadJson) as { username?: unknown };

    if (typeof payload.username === 'string' && payload.username.trim()) {
      return payload.username;
    }
  } catch {
    return '';
  }

  return '';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [currentUsername, setCurrentUsername] = useState<string>(() => getUsernameFromToken(localStorage.getItem('token')));

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setCurrentUsername(getUsernameFromToken(token));
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUsername('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUsername, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
