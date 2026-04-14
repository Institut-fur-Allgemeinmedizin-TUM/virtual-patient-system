import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  Dialog,
  Portal,
  Divider,
  MD3LightTheme,
  PaperProvider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0065BD',
    secondary: '#4CAF50',
  },
};

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
    backgroundColor: '#1976D2',
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
      router.replace('/(tabs)');
    }
  };

  const handleVhbLogin = async () => {
    const success = await loginWithVhb(vhbPassword);
    if (success) {
      setVhbDialogOpen(false);
      setVhbPassword('');
      clearAuthError();
      router.replace('/(tabs)');
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>🎓</Text>
                </View>

                <Text variant="headlineSmall" style={{ textAlign: 'center', marginBottom: 16 }}>
                  Virtuelles Patientensystem
                </Text>

                <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
                  Üben Sie Ihre Anamnesefähigkeiten mit KI-unterstützten virtuellen Patienten
                </Text>

                <Divider style={{ marginVertical: 16 }} />

                <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
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

                <Text variant="labelSmall" style={{ textAlign: 'center', marginBottom: 16, marginTop: 8 }}>
                  Sie werden zur sicheren Anmeldeseite der TU München weitergeleitet.
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
                  <Divider style={{ flex: 1 }} />
                  <Text variant="labelSmall">oder</Text>
                  <Divider style={{ flex: 1 }} />
                </View>

                <Button
                  mode="outlined"
                  onPress={() => {
                    clearAuthError();
                    setVhbDialogOpen(true);
                  }}
                  icon="briefcase"
                  textColor="#4CAF50"
                >
                  VHB Login
                </Button>

                <Text variant="labelSmall" style={{ textAlign: 'center', marginTop: 8 }}>
                  Für Nutzer der Virtuellen Hochschule Bayern
                </Text>
              </Card.Content>
            </Card>
          </ScrollView>
        </LinearGradient>

        {/* VHB Login Dialog */}
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
              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Bitte geben Sie das VHB-Passwort ein, um sich anzumelden.
              </Text>

              {authError ? (
                <Text variant="bodySmall" style={{ color: '#D32F2F', marginBottom: 12 }}>
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
      </SafeAreaView>
    </PaperProvider>
  );
}
