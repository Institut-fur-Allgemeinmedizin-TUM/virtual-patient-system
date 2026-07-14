import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  Drawer,
  Modal,
  Portal,
  Surface,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useUIStore } from '@/stores/useUIStore';
import { router, usePathname } from 'expo-router';

import { appVersion } from '@/lib/util';
import { MarkdownModal } from './markdown-modal';
import { getMarkdownContent } from '@/lib/markdown';
import { Icon } from 'react-native-paper/src';

export function AppHeader() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const pathname = usePathname();
  const sidebarWidth = Math.min(Math.max(width * 0.78, 260), 340);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const tumId = useAuthStore((state) => state.user?.tum_id);
  const roles = useAuthStore((state) => state.user?.roles);
  const preferredUsername = useAuthStore((state) => state.user?.display_name);
  const themeMode = useThemeStore((state) => state.mode);
  const requestScroll = useUIStore((state) => state.requestScroll);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pronouns = useAuthStore((state) => state.user?.pronouns);
  const updatePronouns = useAuthStore((state) => state.updatePronouns);

  const getDisplayPronouns = (p?: string) => (p && p !== 'not_specified' ? p : '');

  const [localPronouns, setLocalPronouns] = useState(getDisplayPronouns(pronouns));
  const [pronounModalVisible, setPronounModalVisible] = useState(false);
  const [hasShownPronounModal, setHasShownPronounModal] = useState(false);

  useEffect(() => {
    setLocalPronouns(getDisplayPronouns(pronouns));
  }, [pronouns]);

  useEffect(() => {
    if (isAuthenticated && !hasShownPronounModal && (!pronouns || pronouns === 'not_specified')) {
      setPronounModalVisible(true);
      setHasShownPronounModal(true);
    }
  }, [isAuthenticated, pronouns, hasShownPronounModal]);

  const handlePronounSelect = (selectedPronoun: string) => {
    updatePronouns(selectedPronoun);
    setPronounModalVisible(false);
  };

  const handlePronounsBlur = () => {
    if (localPronouns !== getDisplayPronouns(pronouns)) {
      updatePronouns(localPronouns || 'not_specified');
      if (!localPronouns) {
        setLocalPronouns('');
      }
    }
  };

  const imprintModalOpen = useUIStore((state) => state.imprintModalOpen);
  const privacyModalOpen = useUIStore((state) => state.privacyModalOpen);
  const setImprintModalOpen = useUIStore((state) => state.setImprintModalOpen);
  const setPrivacyModalOpen = useUIStore((state) => state.setPrivacyModalOpen);

  const logout = async () => {
    await useAuthStore.getState().logout();
  };
  const switchTheme = () => {
    useThemeStore.getState().toggleMode();
  };
  const showPrivacyPolicy = async () => {
    setPrivacyModalOpen(true);
  };

  const showImprint = async () => {
    setImprintModalOpen(true);
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
          color="#C1CBD6"
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

              {preferredUsername ? (
                <>
                  <View style={[styles.profileIdentityRow, { flexDirection: 'row' }]}>
                    <Text
                      style={[
                        styles.profileName,
                        {
                          color: colors.onSurfaceVariant,
                          textDecorationColor: colors.onSurfaceVariant,
                          paddingRight: 5,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      Username:
                    </Text>
                    <Text
                      style={[
                        styles.profileName,
                        {
                          color: colors.onSurfaceVariant,
                          textDecorationColor: colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {preferredUsername}
                    </Text>
                  </View>
                  <Divider />
                </>
              ) : null}

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
                  <TextInput
                    mode="outlined"
                    label="Pronouns"
                    value={localPronouns}
                    onChangeText={setLocalPronouns}
                    onBlur={handlePronounsBlur}
                    onSubmitEditing={handlePronounsBlur}
                    style={styles.pronounsInput}
                    dense
                  />
                </View>
              ) : null}

              <Divider />

              <Drawer.Section>
                {roles?.includes('Admin') && (
                  <>
                    <Drawer.Item
                      icon="chart-bar"
                      label="Analytics"
                      onPress={() => {
                        setProfileSidebarOpen(false);
                        router.push('/analytics');
                      }}
                    />
                    <Drawer.Item
                      icon="comment-multiple-outline"
                      label="Feedbacks"
                      onPress={() => {
                        setProfileSidebarOpen(false);
                        router.push('/feedbacks');
                      }}
                    />
                  </>
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

              <Divider />

              <Drawer.Item
                icon={({ color }) => <Icon source={'text-box-search'} size={20} color={color} />}
                label="Impressum"
                onPress={() => {
                  showImprint();
                }}
                style={{ height: 40 }}
                theme={{
                  fonts: {
                    labelLarge: {
                      fontWeight: 'normal',
                    },
                  },
                }}
              />

              <Drawer.Item
                icon={({ color }) => <Icon source={'gavel'} size={20} color={color} />}
                label="Datenschutz"
                onPress={() => {
                  showPrivacyPolicy();
                }}
                style={{ height: 40 }}
                theme={{
                  fonts: {
                    labelLarge: {
                      fontWeight: 'normal',
                    },
                  },
                }}
              />

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

        <MarkdownModal
          visible={imprintModalOpen}
          onDismiss={() => setImprintModalOpen(false)}
          title="Impressum"
          content={getMarkdownContent('impressum')}
        />

        <MarkdownModal
          visible={privacyModalOpen}
          onDismiss={() => setPrivacyModalOpen(false)}
          title="Datenschutzerklärung"
          content={getMarkdownContent('datenschutz')}
        />

        <Dialog
          visible={pronounModalVisible}
          onDismiss={() => setPronounModalVisible(false)}
          style={{ backgroundColor: colors.elevation.level3, borderRadius: 12 }}
        >
          <Dialog.Title style={{ color: colors.onSurface, textAlign: 'center', fontSize: 22 }}>
            Pronomen
          </Dialog.Title>
          <Dialog.Content>
            <Text
              style={{
                color: colors.onSurfaceVariant,
                fontSize: 16,
                lineHeight: 24,
                textAlign: 'center',
              }}
            >
              Bitte teile uns mit, wie du angesprochen werden möchtest. Für eine neutrale Ansprache
              kannst du die Angabe einfach leer lassen. Du kannst unten eine Option auswählen oder
              deine Pronomen später im Profil anpassen.
            </Text>
          </Dialog.Content>
          <Dialog.Actions
            style={{
              flexDirection: 'column',
              alignItems: 'stretch',
              paddingHorizontal: 24,
              paddingBottom: 24,
            }}
          >
            <Button
              mode="contained"
              style={{ marginBottom: 12 }}
              contentStyle={{ paddingVertical: 4 }}
              onPress={() => handlePronounSelect('sie/ihr')}
            >
              sie/ihr
            </Button>
            <Button
              mode="contained"
              style={{ marginBottom: 16 }}
              contentStyle={{ paddingVertical: 4 }}
              onPress={() => handlePronounSelect('er/ihm')}
            >
              er/ihm
            </Button>
            <Button
              mode="outlined"
              textColor={colors.primary}
              onPress={() => setPronounModalVisible(false)}
            >
              Im Profil anpassen
            </Button>
          </Dialog.Actions>
        </Dialog>
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
    margin: 0,
    opacity: 1,
    width: '100%',
    height: '100%',
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
    flex: 1,
  },
  profileIdentityRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileTumId: {
    fontSize: 12,
  },
  profileName: {
    fontSize: 15,
  },
  profileRoles: {
    fontSize: 12,
    marginTop: 2,
  },
  pronounsInput: {
    marginTop: 12,
    fontSize: 14,
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
