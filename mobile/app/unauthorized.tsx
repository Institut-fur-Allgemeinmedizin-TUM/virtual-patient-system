import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    padding: 20,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  button: {
    width: '100%',
  },
});

export default function UnauthorizedScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleGoHome = () => {
    router.replace('/');
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
        <Card style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="lock-alert" size={40} color={theme.colors.error} />
          </View>

          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Zugriff verweigert
          </Text>

          <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurface }]}>
            Sie haben nicht die erforderlichen Berechtigungen, um auf diese Seite zuzugreifen.
          </Text>

          <Button mode="contained" onPress={handleGoHome} style={styles.button}>
            Zurück zur Startseite
          </Button>
        </Card>
      </LinearGradient>
    </SafeAreaView>
  );
}
