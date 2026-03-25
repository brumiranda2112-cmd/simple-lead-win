import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setStorageUserId } from '@/lib/storage';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  responsible_key: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

type AppRole = 'admin' | 'manager' | 'user';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  session: Session | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  permissions: string[];
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as unknown as UserProfile);
    }

    const userRole = (roleRes.data?.role as AppRole) || null;
    setRole(userRole);

    if (userRole) {
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', userRole);
      setPermissions(perms?.map(p => p.permission as string) || []);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        setStorageUserId(sess.user.id);
        setTimeout(() => fetchUserData(sess.user.id), 0);
      } else {
        setStorageUserId(null);
        setProfile(null);
        setRole(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchUserData(sess.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setPermissions([]);
  }, []);

  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission);
  }, [permissions]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      session,
      isLoggedIn: !!user,
      isAdmin: role === 'admin',
      isLoading,
      login,
      logout,
      hasPermission,
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
