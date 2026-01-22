import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'premium' | 'coach';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

WebBrowser.maybeCompleteAuthSession();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get redirect URL based on platform
  const getRedirectUrl = () => {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/`;
    }
    return Linking.createURL('/');
  };

  // Save session token
  const saveToken = async (token: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('session_token', token);
    } else {
      await SecureStore.setItemAsync('session_token', token);
    }
  };

  // Get session token
  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('session_token');
    }
    return await SecureStore.getItemAsync('session_token');
  };

  // Delete session token
  const deleteToken = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('session_token');
    } else {
      await SecureStore.deleteItemAsync('session_token');
    }
  };

  // Extract session_id from URL
  const extractSessionId = (url: string): string | null => {
    // Try hash first (#session_id=...)
    const hashMatch = url.match(/[#?]session_id=([^&]+)/);
    if (hashMatch) return hashMatch[1];
    
    // Try query param (?session_id=...)
    const queryMatch = url.match(/[?&]session_id=([^&]+)/);
    if (queryMatch) return queryMatch[1];
    
    return null;
  };

  // Exchange session_id for session_token
  const exchangeSession = async (sessionId: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/session`, {
        session_id: sessionId
      });
      
      const { user: userData, session_token } = response.data;
      await saveToken(session_token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Error exchanging session:', error);
      return false;
    }
  };

  // Check existing session
  const checkSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data);
    } catch (error) {
      // Session invalid, clear token
      await deleteToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle URL for auth callback
  const handleUrl = async (url: string) => {
    const sessionId = extractSessionId(url);
    if (sessionId) {
      setIsLoading(true);
      await exchangeSession(sessionId);
      setIsLoading(false);
      
      // Clean URL on web
      if (Platform.OS === 'web') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  };

  // Initialize auth
  useEffect(() => {
    const init = async () => {
      // Check for session_id in URL first (web)
      if (Platform.OS === 'web') {
        const hash = window.location.hash;
        const search = window.location.search;
        const fullUrl = window.location.href;
        
        if (hash.includes('session_id') || search.includes('session_id')) {
          await handleUrl(fullUrl);
          return;
        }
      }

      // Check for cold start URL (mobile)
      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const sessionId = extractSessionId(initialUrl);
          if (sessionId) {
            setIsLoading(true);
            await exchangeSession(sessionId);
            setIsLoading(false);
            return;
          }
        }
      }

      // Check existing session
      await checkSession();
    };

    init();

    // Listen for URL changes (mobile hot link)
    if (Platform.OS !== 'web') {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        handleUrl(url);
      });
      return () => subscription.remove();
    }
  }, []);

  // Login
  const login = async () => {
    const redirectUrl = getRedirectUrl();
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        await handleUrl(result.url);
      }
    }
  };

  // Logout
  const logout = async () => {
    try {
      const token = await getToken();
      if (token) {
        await axios.post(`${API_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await deleteToken();
      setUser(null);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    await checkSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
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
