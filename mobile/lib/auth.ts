import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_access_token';

export const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://192.168.178.21:8000';
  }

  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export interface MobileExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user?: {
    sub?: string;
    tum_id?: string;
    email?: string;
    name?: string;
  };
}

export async function saveAccessToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
}
