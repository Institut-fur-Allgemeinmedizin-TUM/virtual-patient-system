import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Appbar,
  Button,
  Divider,
  Drawer,
  Modal,
  Portal,
  Surface,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useUIStore } from '@/stores/useUIStore';
import { router, usePathname } from 'expo-router';

import { appVersion } from '@/lib/util';

export function AppHeader() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const pathname = usePathname();
  const sidebarWidth = Math.min(Math.max(width * 0.78, 260), 340);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const tumId = useAuthStore((state) => state.user?.tum_id);
  const roles = useAuthStore((state) => state.user?.roles);
  const themeMode = useThemeStore((state) => state.mode);
  const requestScroll = useUIStore((state) => state.requestScroll);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const logout = async () => {
    await useAuthStore.getState().logout();
  };
  const switchTheme = () => {
    useThemeStore.getState().toggleMode();
  };

  const isLandingPage =
    pathname === '/' || pathname === '/(caseOverview)' || pathname === '/(caseOverview)/';
  const showDesktopNav = width > 900 && isLandingPage;

  return (
    <>
      <Appbar.Header elevated style={{ backgroundColor: '#0e396e' }}>
        <Appbar.Action
          icon="hospital-box-outline"
          onPress={() => {
            router.push('/');
          }}
          accessibilityLabel="App logo"
        />
        <Appbar.Content
          title={
            <Pressable onPress={() => router.push('/')}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[{ fontSize: 20, fontWeight: '600', color: '#C1CBD6' }]}>
                  TUM Virtual Patient System
                </Text>

                {showDesktopNav && (
                  <View style={styles.desktopNav}>
                    <Button
                      mode="text"
                      textColor="#C1CBD6"
                      onPress={() => requestScroll('howto')}
                      labelStyle={styles.navLabel}
                    >
                      Anleitung
                    </Button>
                    <Button
                      mode="text"
                      textColor="#C1CBD6"
                      onPress={() => requestScroll('functions')}
                      labelStyle={styles.navLabel}
                    >
                      Funktionen
                    </Button>
                    <Button
                      mode="text"
                      textColor="#C1CBD6"
                      onPress={() => requestScroll('evaluation')}
                      labelStyle={styles.navLabel}
                    >
                      Bewertung
                    </Button>
                    <Button
                      mode="text"
                      textColor="#C1CBD6"
                      onPress={() => requestScroll('cases')}
                      labelStyle={styles.navLabel}
                    >
                      Fälle
                    </Button>
                  </View>
                )}
              </View>
            </Pressable>
          }
        />

        <Appbar.Action
          icon={
            themeMode === 'dark'
              ? 'moon-waning-crescent'
              : themeMode === 'system'
                ? 'laptop'
                : 'weather-sunny'
          }
          onPress={switchTheme}
          accessibilityLabel="Toggle theme"
          color="#C1CBD6"
        />

        {isAuthenticated ? (
          <Appbar.Action
            icon="account-circle-outline"
            onPress={() => {
              setProfileSidebarOpen(true);
            }}
            accessibilityLabel="Open profile"
            color="#C1CBD6"
          />
        ) : (
          <Button
            mode="contained"
            onPress={() => router.push('/login')}
            style={styles.loginButton}
            labelStyle={styles.loginButtonLabel}
          >
            Anmelden
          </Button>
        )}
      </Appbar.Header>

      <Portal>
        <Modal
          visible={profileSidebarOpen}
          onDismiss={() => setProfileSidebarOpen(false)}
          dismissable
          dismissableBackButton
          contentContainerStyle={styles.sidebarModalContainer}
        >
          <View style={styles.sidebarLayout}>
            <Pressable
              style={styles.sidebarBackdropTouchZone}
              onPress={() => setProfileSidebarOpen(false)}
              accessibilityLabel="Close sidebar"
            />

            <Surface style={[styles.sidebarPanel, { width: sidebarWidth }]} elevation={2}>
              <Appbar.Header elevated={false}>
                <Appbar.Content title="User Profile" />
                <Appbar.Action
                  icon="close"
                  onPress={() => setProfileSidebarOpen(false)}
                  accessibilityLabel="Close profile sidebar"
                />
              </Appbar.Header>

              <Divider />

              {tumId ? (
                <View style={styles.profileIdentityRow}>
                  <Text
                    style={[
                      styles.profileTumId,
                      {
                        color: colors.onSurfaceVariant,
                        textDecorationColor: colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    TUM ID: {tumId}
                  </Text>
                  {roles && roles.length > 0 && (
                    <Text
                      style={[
                        styles.profileRoles,
                        {
                          color: colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      Roles: {roles.join(', ')}
                    </Text>
                  )}
                </View>
              ) : null}

              <Divider />

              <Drawer.Section>
                {roles?.includes('Admin') && (
                  <Drawer.Item
                    icon="chart-bar"
                    label="Analytics"
                    onPress={() => {
                      setProfileSidebarOpen(false);
                      router.push('/analytics');
                    }}
                  />
                )}
                <Drawer.Item
                  icon="logout"
                  label="Sign out"
                  onPress={() => {
                    setProfileSidebarOpen(false);
                    logout();
                  }}
                />
              </Drawer.Section>

              <View style={{ flex: 1 }} />

              <View style={styles.versionContainer}>
                <Divider />
                <View style={styles.versionRow}>
                  <Appbar.Action icon="github" color={colors.onSurfaceVariant} size={18} />
                  <Text
                    style={[styles.versionText, { color: colors.onSurfaceVariant }]}
                  >{`Version ${appVersion}`}</Text>
                </View>
              </View>
            </Surface>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  desktopNav: {
    flexDirection: 'row',
    marginLeft: 30,
    gap: 10,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  loginButton: {
    marginRight: 8,
    backgroundColor: '#C1CBD6',
    borderRadius: 4,
  },
  loginButtonLabel: {
    color: '#0e396e',
    fontWeight: '700',
    fontSize: 13,
  },
  sidebarModalContainer: {
    flex: 1,
    margin: 0,
    opacity: 100,
  },
  sidebarLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sidebarBackdropTouchZone: {
    flex: 1,
  },
  sidebarPanel: {
    height: '100%',
  },
  profileIdentityRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileTumId: {
    fontSize: 12,
  },
  profileRoles: {
    fontSize: 12,
    marginTop: 2,
  },
  versionContainer: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  versionText: {
    fontSize: 12,
    marginLeft: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
