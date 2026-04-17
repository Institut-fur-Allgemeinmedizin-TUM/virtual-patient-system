import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { apiClient } from '@/lib/apiClient';
import {
  API_BASE_URL,
  clearAccessToken,
  getAccessToken,
  saveAccessToken,
  type MobileExchangeResponse,
} from '@/lib/auth';

interface AuthState {
  authError: string;
  authChecked: boolean;
  isAuthenticated: boolean;
  tumLoading: boolean;
  vhbLoading: boolean;
  clearAuthError: () => void;
  checkStoredToken: () => Promise<void>;
  loginWithTum: () => Promise<boolean>;
  loginWithVhb: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authError: '',
  authChecked: false,
  isAuthenticated: false,
  tumLoading: false,
  vhbLoading: false,

  clearAuthError: () => set({ authError: '' }),

  checkStoredToken: async () => {
    const token = await getAccessToken();
    set({ isAuthenticated: Boolean(token), authChecked: true });
  },

  loginWithTum: async () => {
    set({ authError: '', tumLoading: true });

    try {
      if (Platform.OS === 'web') {
        const loginUrl = `${API_BASE_URL}/auth/login?redirect_to=${encodeURIComponent('/')}`;
        window.location.href = loginUrl;
        return false;
      }

      const redirectUri = ExpoLinking.createURL('/auth/callback', {
        scheme: 'mobile',
      });
      const loginUrl = `${API_BASE_URL}/auth/login?redirect_to=${encodeURIComponent(redirectUri)}`;

      const authResult = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

      if (authResult.type !== 'success') {
        if (authResult.type !== 'cancel') {
          set({
            authError: 'Anmeldung wurde abgebrochen. Bitte versuchen Sie es erneut.',
          });
        }
        return false;
      }

      const parsedUrl = ExpoLinking.parse(authResult.url);
      const codeParam = parsedUrl.queryParams?.code;
      const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

      if (!code || typeof code !== 'string') {
        set({
          authError: 'Ungueltige Anmeldung. Bitte versuchen Sie es erneut.',
        });
        return false;
      }

      const exchangeResponse = await fetch(`${API_BASE_URL}/auth/mobile/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!exchangeResponse.ok) {
        const error = await exchangeResponse
          .json()
          .catch(() => ({ detail: 'Anmeldung fehlgeschlagen' }));
        set({ authError: error.detail || 'Anmeldung fehlgeschlagen' });
        return false;
      }

      const data: MobileExchangeResponse = await exchangeResponse.json();
      await saveAccessToken(data.access_token);
      set({ isAuthenticated: true });
      return true;
    } catch {
      set({
        authError: 'Anmeldung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
      });
      return false;
    } finally {
      set({ tumLoading: false });
    }
  },

  loginWithVhb: async (password: string) => {
    set({ authError: '', vhbLoading: true });

    const res = await apiClient.auth.vhbLoginAuthVhbLoginPost({
      password,
    });
    if (res.status === 200) {
      const data = res.data;
      if (data?.token && typeof data.token === 'string') {
        await saveAccessToken(data.token);
      }
      set({ isAuthenticated: true, vhbLoading: false });
      return true;
    } else {
      set({ authError: res.statusText || 'Login fehlgeschlagen', vhbLoading: false });
      return false;
    }
  },

  logout: async () => {
    const res = await apiClient.auth.authLogoutAuthLogoutPost({});
    if (res.status === 200) {
      await clearAccessToken();
      set({ isAuthenticated: false, authError: '', authChecked: true });
    }
  },
}));
