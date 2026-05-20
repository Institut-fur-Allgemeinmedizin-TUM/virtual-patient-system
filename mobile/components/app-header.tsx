import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Appbar, Divider, Drawer, Modal, Portal, Surface, useTheme } from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { router } from 'expo-router';

import {grey600, grey50} from "react-native-paper/src/styles/themes/v2/colors";
import {appVersion} from "@/lib/util";

export function AppHeader() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const sidebarWidth = Math.min(Math.max(width * 0.78, 260), 340);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const tumId = useAuthStore((state) => state.user?.tum_id);
  const themeMode = useThemeStore((state) => state.mode);
  const logout = async () => {
    await useAuthStore.getState().logout();
  };
  const switchTheme = () => {
    useThemeStore.getState().toggleMode();
  };

  return (
    <>
      <Appbar.Header elevated>
        <Appbar.Action
          icon="hospital-box-outline"
          onPress={() => {
            router.push('/');
          }}
          accessibilityLabel="App logo"
        />
        <Appbar.Content title={
          <View style={{ flexDirection: 'column', justifyContent: 'center',}}>
            <Text
              style={[{ fontSize: 20, fontWeight: '600', color: themeMode === 'dark' || themeMode === 'system' ? grey50 : grey600 }]}
            >
              TUM Virtual Patient System
            </Text>
          </View>
        }/>

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
        />

        <Appbar.Action
          icon="account-circle-outline"
          onPress={() => {
            setProfileSidebarOpen(true);
          }}
          accessibilityLabel="Open profile"
        />
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
                </View>
              ) : null}

              <Divider />

              <Drawer.Section>
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
                  <Text style={[styles.versionText, { color: colors.onSurfaceVariant }]}>{`Version ${appVersion}`}</Text>
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
  sidebarModalContainer: {
    flex: 1,
    margin: 0,
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
