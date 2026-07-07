import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { apiClient } from '@/lib/apiClient';
import { API_BASE_URL, clearAccessToken, getAccessToken, saveAccessToken } from '@/lib/auth';

interface User {
  sub?: string;
  tum_id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  display_name?: string;
}

interface AuthState {
  authError: string;
  authChecked: boolean;
  isAuthenticated: boolean;
  tumLoading: boolean;
  vhbLoading: boolean;
  user?: User;
  clearAuthError: () => void;
  checkStoredToken: () => Promise<void>;
  loginWithTum: () => Promise<boolean>;
  loginWithVhb: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

function readApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const response = (error as { response?: { data?: { detail?: string } } }).response;
  const detail = response?.data?.detail;

  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }

  return fallback;
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

    if (token) {
      try {
        const res = await apiClient.auth.authMeAuthMeGet();
        if (res.status === 200) {
          set({ isAuthenticated: true, authChecked: true, user: res.data });
          return;
        }
      } catch {
        await clearAccessToken();
        if (Platform.OS !== 'web') {
          set({ isAuthenticated: false, authChecked: true });
          return;
        }
      }
    }

    if (Platform.OS === 'web') {
      try {
        const res = await apiClient.auth.authMeAuthMeGet({ secure: false });
        if (res.status === 200) {
          set({ isAuthenticated: true, authChecked: true, user: res.data });
          return;
        }
      } catch {
        // No active web session; fall through to unauthenticated state.
      }
    }

    set({ isAuthenticated: false, authChecked: true });
  },

  loginWithTum: async () => {
    set({ authError: '', tumLoading: true });

    try {
      // 1. Web Flow: Standard cookie-based redirection
      if (Platform.OS === 'web') {
        const loginUrl = `${API_BASE_URL}/auth/login?redirect_to=${encodeURIComponent('/')}`;
        window.location.href = loginUrl;
        return false;
      }

      // 2. Mobile Flow: Generate the deep link
      const redirectUri = ExpoLinking.createURL('callback');
      console.log('🔗 Deep Link redirectUri:', redirectUri);

      // Tell the backend exactly where to send the user after logging in
      const loginUrl = `${API_BASE_URL}/auth/login?redirect_to=${encodeURIComponent(redirectUri)}`;
      console.log('🔗 Login URL:', loginUrl);

      // 3. Open the secure browser
      // The user logs into TUM, the backend processes the code/state,
      // and redirects back to `redirectUri?token=XYZ`
      const authResult = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

      if (authResult.type !== 'success') {
        if (authResult.type !== 'cancel') {
          set({
            authError: 'Anmeldung wurde abgebrochen. Bitte versuchen Sie es erneut.',
          });
        }
        return false;
      }

      // 4. Extract the token passed by your backend
      console.log('🔗 Auth Result URL:', authResult.url);
      const parsedUrl = ExpoLinking.parse(authResult.url);
      console.log('🔗 Parsed URL:', parsedUrl);
      const tokenParam = parsedUrl.queryParams?.token;
      console.log('🔗 Token Param:', tokenParam);

      // Handle edge case where parsing returns an array
      const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

      if (!token || typeof token !== 'string') {
        set({
          authError: 'Ungültige Anmeldung. Session-Token fehlt.',
        });
        return false;
      }

      await saveAccessToken(token);
      set({ isAuthenticated: true });
      return true;
    } catch (error) {
      console.error('Login error:', error);
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

    try {
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
      }

      set({ authError: res.statusText || 'Login fehlgeschlagen', vhbLoading: false });
      return false;
    } catch (error) {
      set({
        authError: readApiErrorMessage(error, 'Login fehlgeschlagen'),
        vhbLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await apiClient.auth.authLogoutAuthLogoutPost({});
    } catch {
      // Ignore backend logout errors (e.g., expired token) and clear local session anyway.
    } finally {
      await clearAccessToken();
      set({ isAuthenticated: false, authError: '', authChecked: true });
    }
  },
}));
