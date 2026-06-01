import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';

import { AppHeader } from '@/components/app-header';
import {
  navigationDarkTheme,
  navigationLightTheme,
  paperDarkTheme,
  paperLightTheme,
} from '@/constants/theme';

import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import React from 'react';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useThemeStore();
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

    const inLoginScreen = segments[0] === 'login';
    const isPublicSegment = segments[0] === '(caseOverview)' ;

    if (!isAuthenticated && !inLoginScreen && !isPublicSegment) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/(caseOverview)');
    }
  }, [authChecked, isAuthenticated, router, segments]);

  if (!authChecked) {
    return null;
  }

  return (
    <PaperProvider
      theme={colorScheme.getResolvedTheme() === 'dark' ? paperDarkTheme : paperLightTheme}
    >
      <ThemeProvider
        value={
          colorScheme.getResolvedTheme() === 'dark' ? navigationDarkTheme : navigationLightTheme
        }
      >
        <Stack
          screenOptions={{
            header: () => <AppHeader />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: 'transparent' },
            headerTitle: '',
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ title: '' }} />
          <Stack.Screen name="(caseOverview)" options={{ title: '' }} />
          <Stack.Screen name="session/[sessionId]" options={{ title: 'Session' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: '' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
