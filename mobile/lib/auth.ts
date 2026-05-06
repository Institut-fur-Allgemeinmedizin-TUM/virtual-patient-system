import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_access_token';

export const getApiBaseUrl = () => {
  // Development: Check for explicit BACKEND_URL environment variable
  // Set before running: export EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    console.log(`Using BACKEND_URL from env: ${envUrl}`);
    return envUrl;
  }
  
  // Production/Docker: Frontend and backend on same origin
  // This works because app.main.py serves both on the same port
  if (typeof window !== 'undefined') {
    console.log(`Using origin: ${window.location.origin}`);
    return window.location.origin;
  }
  
  // Fallback for SSR/build time
  return 'http://localhost:8080';
};

// Don't call getApiBaseUrl() at module load time - defer to runtime
// Import this function and call it where needed
export const API_BASE_URL = typeof window !== 'undefined' ? getApiBaseUrl() : 'http://localhost:8080';

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
