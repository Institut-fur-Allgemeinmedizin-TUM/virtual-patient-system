import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/useAuthStore';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const authChecked = useAuthStore((state) => state.authChecked);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkStoredToken = useAuthStore((state) => state.checkStoredToken);

  useEffect(() => {
    if (!authChecked) {
      checkStoredToken();
    }
  }, [authChecked, checkStoredToken]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    const inTabsGroup = segments[0] === '(tabs)';
    const inLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && inTabsGroup) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [authChecked, isAuthenticated, router, segments]);

  if (!authChecked) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
