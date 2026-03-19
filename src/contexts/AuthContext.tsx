import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CrmUser } from '@/types/crm';
import * as storage from '@/lib/storage';

interface AuthContextType {
  user: CrmUser | null;
  isLoggedIn: boolean;
  hasAccount: boolean;
  login: (email: string, password: string) => boolean;
  register: (email: string, name: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CrmUser | null>(null);

  useEffect(() => {
    if (storage.isAuthenticated()) {
      setUser(storage.getUser());
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    const u = storage.loginUser(email, password);
    if (u) { setUser(u); return true; }
    return false;
  }, []);

  const register = useCallback((email: string, name: string, password: string) => {
    const u = storage.registerUser(email, name, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    storage.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, hasAccount: !!storage.getUser(), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
