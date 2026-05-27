import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Button,
  Card,
  Text,
  useTheme,
  List,
  Divider,
  Surface,
  Avatar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';

export default function LandingPage() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isWeb = width > 768;
  const isSmallMobile = width < 400;
  const containerPadding = isWeb ? 40 : 16;
  const maxWidth = 1000;

  const changelog = [
    {
      version: 'v1.2.0',
      date: '20. Mai 2026',
      changes: 'Verbesserung der KI-Antwortzeit und neue Diagnose-Features.',
    },
    {
      version: 'v1.1.0',
      date: '05. April 2026',
      changes: 'Einführung der Live-Audio-Funktion für natürlichere Gespräche.',
    },
    {
      version: 'v1.0.0',
      date: '01. März 2026',
      changes: 'Launch des Virtuellen Patientensystems mit Basisfällen.',
    },
  ];

  const steps = [
    {
      title: 'Fall auswählen',
      description: 'Wählen Sie aus einer Liste von verschiedenen medizinischen Fällen einen Patienten aus.',
      icon: 'format-list-bulleted',
    },
    {
      title: 'Anamnese führen',
      description: 'Stellen Sie dem Patienten Fragen zu seinen Beschwerden und der Krankengeschichte.',
      icon: 'chat-processing-outline',
    },
    {
      title: 'Diagnose & Untersuchungen',
      description: 'Fordern Sie Untersuchungen an und stellen Sie eine Verdachtsdiagnose.',
      icon: 'stethoscope',
    },
    {
      title: 'Feedback erhalten',
      description: 'Erhalten Sie eine detaillierte Auswertung Ihrer Leistung nach Abschluss des Falls.',
      icon: 'chart-check',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.content, { padding: containerPadding, maxWidth: maxWidth, alignSelf: 'center' }]}>
        
        {/* Hero Section */}
        <Surface style={styles.heroSurface} elevation={1}>
          <LinearGradient
            colors={theme.dark 
              ? [theme.colors.primaryContainer, theme.colors.surface] 
              : [theme.colors.primary, theme.colors.primaryContainer]}
            style={[styles.heroGradient, !isWeb && { padding: 24 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <Avatar.Icon 
                size={isWeb ? 80 : 64} 
                icon="doctor" 
                style={{ backgroundColor: 'transparent' }} 
                color={theme.dark ? theme.colors.primary : '#fff'} 
              />
              <Text 
                variant={isWeb ? "headlineMedium" : "headlineSmall"} 
                style={[styles.heroTitle, { color: theme.dark ? theme.colors.onSurface : '#fff' }]}
              >
                Willkommen beim Virtuellen Patientensystem
              </Text>
              <Text 
                variant="bodyLarge" 
                style={[styles.heroSubtitle, { color: theme.dark ? theme.colors.onSurfaceVariant : '#fff' }]}
              >
                Trainieren Sie Ihre diagnostischen Fähigkeiten mit KI-gestützten Patientensimulationen.
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/(caseOverview)/cases')}
                style={styles.ctaButton}
                contentStyle={styles.ctaButtonContent}
                buttonColor={theme.dark ? theme.colors.primary : theme.colors.surface}
                textColor={theme.dark ? theme.colors.onPrimary : theme.colors.primary}
              >
                Zu den Fällen
              </Button>
            </View>
          </LinearGradient>
        </Surface>

        {/* Project Description */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Über das Projekt</Text>
            <Text variant="bodyMedium" style={styles.paragraph}>
              Dieses System wurde entwickelt, um Medizinstudierenden eine praxisnahe und sichere Umgebung für das Training von Anamnesegesprächen zu bieten. Unsere virtuellen Patienten nutzen modernste Sprachmodelle, um individuell und medizinisch fundiert auf Ihre Fragen zu reagieren.
            </Text>
          </Card.Content>
        </Card>

        {/* How to use */}
        <Text variant="titleLarge" style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>So funktioniert es</Text>
        <View style={isWeb ? styles.stepsContainerWeb : styles.stepsContainerMobile}>
          {steps.map((step, index) => (
            <Card key={index} style={[styles.stepCard, isWeb && { flex: 1, marginHorizontal: 8 }]}>
              <Card.Title 
                title={step.title} 
                titleNumberOfLines={2}
                titleStyle={isSmallMobile ? { fontSize: 16, lineHeight: 20 } : undefined}
                left={(props) => <Avatar.Icon {...props} icon={step.icon} size={isSmallMobile ? 32 : 40} />}
              />
              <Card.Content>
                <Text variant="bodyMedium" style={isSmallMobile && { fontSize: 13 }}>{step.description}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Feedback & Questions */}
        <Card style={[styles.sectionCard, { marginTop: 32, backgroundColor: theme.colors.secondaryContainer }]}>
          <Card.Content>
            <View style={styles.feedbackRow}>
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={[{ color: theme.colors.onSecondaryContainer }, isSmallMobile && { fontSize: 18 }]}>Fragen oder Feedback?</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer, marginTop: 8 }}>
                  Wir arbeiten ständig an der Verbesserung des Systems. Kontaktieren Sie uns gerne bei Problemen oder Anregungen.
                </Text>
                <Text 
                  variant="labelLarge" 
                  style={{ color: theme.colors.primary, marginTop: 16, fontWeight: 'bold' }}
                  onPress={() => Linking.openURL('mailto:support@virtual-patient.edu')}
                >
                  support@virtual-patient.edu
                </Text>
              </View>
              {isWeb && <Avatar.Icon size={48} icon="email-outline" style={{ backgroundColor: 'transparent' }} />}
            </View>
          </Card.Content>
        </Card>

        {/* Changelog */}
        <List.Section style={styles.changelogSection}>
          <List.Subheader>Changelog</List.Subheader>
          {changelog.map((entry, index) => (
            <React.Fragment key={index}>
              <List.Item
                title={entry.version}
                titleStyle={isSmallMobile && { fontSize: 14 }}
                description={entry.changes}
                descriptionStyle={isSmallMobile && { fontSize: 12 }}
                right={() => <Text variant="labelSmall" style={styles.changelogDate}>{entry.date}</Text>}
              />
              {index < changelog.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List.Section>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
  },
  heroSurface: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroGradient: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  heroTitle: {
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  ctaButton: {
    borderRadius: 28,
    elevation: 4,
  },
  ctaButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    lineHeight: 24,
    opacity: 0.8,
  },
  stepsContainerWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepsContainerMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  stepCard: {
    borderRadius: 16,
    elevation: 1,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  changelogSection: {
    marginTop: 32,
  },
  changelogDate: {
    alignSelf: 'center',
    opacity: 0.5,
  },
});
