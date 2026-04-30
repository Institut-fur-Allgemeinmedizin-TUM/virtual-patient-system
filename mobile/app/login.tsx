import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import {
  Card,
  Button,
  Dialog,
  Divider,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
});

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [vhbDialogOpen, setVhbDialogOpen] = useState(false);
  const [vhbPassword, setVhbPassword] = useState('');
  const authError = useAuthStore((state) => state.authError);
  const tumLoading = useAuthStore((state) => state.tumLoading);
  const vhbLoading = useAuthStore((state) => state.vhbLoading);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const loginWithTum = useAuthStore((state) => state.loginWithTum);
  const loginWithVhb = useAuthStore((state) => state.loginWithVhb);

  const handleTumLogin = async () => {
    const success = await loginWithTum();
    if (success) {
      router.replace('/');
    }
  };

  const handleVhbLogin = async () => {
    const success = await loginWithVhb(vhbPassword);
    if (success) {
      setVhbDialogOpen(false);
      setVhbPassword('');
      clearAuthError();
      router.replace('/');
    }
  };

  const gradientColors = theme.dark
    ? ([theme.colors.background, theme.colors.surfaceVariant] as const)
    : ([theme.colors.primaryContainer, theme.colors.surface] as const);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <Card style={styles.card}>
            <Card.Content>
              <View
                style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}
              >
                <Text style={[styles.iconText, { color: theme.colors.primary }]}>🎓</Text>
              </View>

              <Text
                variant="headlineSmall"
                style={{ textAlign: 'center', marginBottom: 16, color: theme.colors.onSurface }}
              >
                Virtuelles Patientensystem
              </Text>

              <Text
                variant="bodyMedium"
                style={{
                  textAlign: 'center',
                  marginBottom: 16,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Üben Sie Ihre Anamnesefähigkeiten mit KI-unterstützten virtuellen Patienten
              </Text>

              <Divider style={{ marginVertical: 16 }} />

              <Text
                variant="bodyMedium"
                style={{ textAlign: 'center', marginBottom: 16, color: theme.colors.onSurface }}
              >
                Bitte melden Sie sich mit Ihrer TUM-Kennung an
              </Text>

              <Button
                mode="contained"
                onPress={handleTumLogin}
                icon="lock"
                loading={tumLoading}
                disabled={tumLoading || vhbLoading}
              >
                Mit TUM-Kennung anmelden
              </Button>

              <Text
                variant="labelSmall"
                style={{
                  textAlign: 'center',
                  marginBottom: 16,
                  marginTop: 8,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Sie werden zur sicheren Anmeldeseite der TU München weitergeleitet.
              </Text>

              <View
                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}
              >
                <Divider style={{ flex: 1 }} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  oder
                </Text>
                <Divider style={{ flex: 1 }} />
              </View>

              <Button
                mode="outlined"
                onPress={() => {
                  clearAuthError();
                  setVhbDialogOpen(true);
                }}
                icon="briefcase"
                textColor={theme.colors.primary}
              >
                VHB Login
              </Button>

              <Text
                variant="labelSmall"
                style={{ textAlign: 'center', marginTop: 8, color: theme.colors.onSurfaceVariant }}
              >
                Für Nutzer der Virtuellen Hochschule Bayern
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <Portal>
          <Dialog
            visible={vhbDialogOpen}
            onDismiss={() => {
              setVhbDialogOpen(false);
              clearAuthError();
            }}
          >
            <Dialog.Title>💼 VHB Login</Dialog.Title>
            <Dialog.Content>
              <Text
                variant="bodyMedium"
                style={{ marginBottom: 16, color: theme.colors.onSurface }}
              >
                Bitte geben Sie das VHB-Passwort ein, um sich anzumelden.
              </Text>

              {authError ? (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12 }}>
                  {authError}
                </Text>
              ) : null}

              <TextInput
                label="Passwort"
                secureTextEntry
                value={vhbPassword}
                onChangeText={(value) => {
                  if (authError) {
                    clearAuthError();
                  }
                  setVhbPassword(value);
                }}
                disabled={vhbLoading}
                onSubmitEditing={handleVhbLogin}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  setVhbDialogOpen(false);
                  setVhbPassword('');
                  clearAuthError();
                }}
                disabled={vhbLoading}
              >
                Abbrechen
              </Button>
              <Button
                mode="contained"
                onPress={handleVhbLogin}
                loading={vhbLoading}
                disabled={vhbLoading || !vhbPassword}
              >
                Anmelden
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </LinearGradient>
    </SafeAreaView>
  );
}
