import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './profile';

export interface AuthState {
  userId?: string;
  email?: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ isLoading: true });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setState({
        isLoading: false,
        userId: session?.user?.id,
        email: session?.user?.email ?? null,
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setState({ isLoading: false, userId: session?.user?.id, email: session?.user?.email ?? null });
      if (session?.user?.id && Device.isDevice) {
        const perms = await Notifications.getPermissionsAsync();
        if (perms.status === 'granted') {
          const token = await Notifications.getExpoPushTokenAsync();
          await registerPushToken(session.user.id, token.data, Device.osName ?? undefined);
        }
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signInWithPassword: AuthContextValue['signInWithPassword'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signUpWithPassword: AuthContextValue['signUpWithPassword'] = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>((): AuthContextValue => ({
    isLoading: state.isLoading,
    userId: state.userId,
    email: state.email,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
