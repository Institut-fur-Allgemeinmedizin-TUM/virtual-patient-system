import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Appbar, Divider, Drawer, Modal, Portal, Surface } from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { router } from 'expo-router';

export function AppHeader() {
  const { width } = useWindowDimensions();
  const sidebarWidth = Math.min(Math.max(width * 0.78, 260), 340);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
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
        <Appbar.Content title="TUM Virtual Patient System" />

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
});
