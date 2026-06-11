import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUsername: string;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getUsernameFromToken(token: string | null): string {
  if (!token) return 'owner';

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return 'owner';

    const normalizedBase64 = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payloadJson = atob(normalizedBase64);
    const payload = JSON.parse(payloadJson) as { username?: unknown };

    if (typeof payload.username === 'string' && payload.username.trim()) {
      return payload.username;
    }
  } catch {
    return 'owner';
  }

  return 'owner';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [currentUsername, setCurrentUsername] = useState<string>('owner');

  useEffect(() => {
    setCurrentUsername(getUsernameFromToken(localStorage.getItem('token')));
  }, [isAuthenticated]);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
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
