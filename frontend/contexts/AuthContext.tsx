import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { navigateToHome } from '../services/navigation';
import { useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';

// Define the context shape
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: string | null; // Role from profiles table
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Fetch user role from profiles table
  const fetchUserRole = async (userId: string) => {
    try {
      console.log('🔍 Fetching role for user ID:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching role:', error);
      } else if (data) {
        console.log('✅ User role fetched:', data.role);
        setUserRole(data.role);
      } else {
        console.log('⚠️ No role data returned');
      }
    } catch (error) {
      console.error('💥 Exception in fetchUserRole:', error);
    }
  };

  // Initialize auth
  useEffect(() => {
    // Get initial session — AWAIT the role so we don't finish loading (and let
    // the tabs render) before we know if this is a coach. Prevents the wrong-tab
    // flicker / momentary "Acceso solo para coach" lockout.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Don't redirect away from reset-password when the recovery token is processed
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          // Force navigation to the reset screen because the email link might have landed them on /auth/login
          router.replace('/auth/reset-password' as any);
        } else if (event === 'USER_UPDATED') {
          // Password was changed — clear recovery state
          setIsPasswordRecovery(false);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle the password-recovery deep link (native). Supabase returns the
  // tokens in the URL fragment; we exchange them for a session and route to the
  // reset screen. (detectSessionInUrl is off, so we parse manually.)
  useEffect(() => {
    const handleRecoveryUrl = async (url: string | null) => {
      if (!url || !url.includes('type=recovery')) return;
      const frag = url.split('#')[1] || url.split('?')[1] || '';
      const params: Record<string, string> = {};
      frag.split('&').forEach((kv) => {
        const [k, v] = kv.split('=');
        if (k) params[k] = decodeURIComponent(v || '');
      });
      if (params.access_token && params.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          setIsPasswordRecovery(true);
          router.replace('/auth/reset-password' as any);
        } catch (e) {
          console.error('Recovery deep link error:', e);
        }
      }
    };

    Linking.getInitialURL().then(handleRecoveryUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleRecoveryUrl(url));
    return () => sub.remove();
  }, []);

  // Protect routes
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const onResetPage = String(segments[1]) === 'reset-password';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup && !onResetPage && !isPasswordRecovery) {
      // isPasswordRecovery or being on the reset-password page prevents redirect while the user resets their password
      navigateToHome(router);
    }
  }, [user, segments, isLoading, isPasswordRecovery]);

  // Sign In
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    // Navigation is handled by the useEffect above
  };

  // Sign Up
  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;
    // Navigation is handled by the useEffect above
  };

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        userRole,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;

