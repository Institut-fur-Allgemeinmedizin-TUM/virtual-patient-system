import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import { Text, useTheme, Surface, TouchableRipple, Button, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useCasesStore } from '@/stores/useCasesStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Case, getCaseImage } from '@/lib/cases/case';
import { Image } from 'expo-image';
import EvaluationModal from '../components/EvaluationModal';

const TUM_BLUE = '#0065BD';
const TUM_DARK = '#003359';

export default function LandingPage() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cases = useCasesStore((state) => state.cases);
  const loaded = useCasesStore((state) => state.loaded);
  const sessionScores = useCasesStore((state) => state.sessionScores);
  const loadAndGetCases = useCasesStore((state) => state.loadAndGetCases);
  const loadSessionSummaries = useCasesStore((state) => state.loadSessionSummaries);
  const startCase = useSessionStore((state) => state.startSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const scrollRequest = useUIStore((state) => state.scrollRequest);
  const requestScroll = useUIStore((state) => state.requestScroll);

  useEffect(() => {
    void loadAndGetCases();
  }, [loadAndGetCases]);

  useEffect(() => {
    if (loaded) {
      void loadSessionSummaries();
    }
  }, [loaded, loadSessionSummaries]);

  useEffect(() => {
    if (scrollRequest) {
      const y = sectionPositions.current[scrollRequest.section];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y, animated: true });
        useUIStore.setState({ scrollRequest: null });
      }
    }
  }, [scrollRequest]);

  const landingEvalScores = useMemo(() => [4, 2, 5, 3, 1, 3, 5, 4], []);

  const getScaleColor = (score: number) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    return colors[score - 1] || colors[2];
  };

  const onLayout = (key: string) => (event: any) => {
    sectionPositions.current[key] = event.nativeEvent.layout.y;
  };

  const isWeb = width > 768;

  const getDifficultyStyle = (difficulty: string) => {
    if (theme.dark) {
      switch (difficulty) {
        case 'Leicht':
          return { bg: '#1b2e1d', text: '#81c784' };
        case 'Schwer':
          return { bg: '#2c1515', text: '#e57373' };
        default:
          return { bg: '#2b261b', text: '#ffd54f' };
      }
    }
    switch (difficulty) {
      case 'Leicht':
        return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'Schwer':
        return { bg: '#fdf2f2', text: '#c0392b' };
      default:
        return { bg: '#fffbeb', text: '#92400e' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 2.5) return '#d93025'; // red
    if (score <= 4) return '#d67e00'; // orange
    return '#0b7f5a'; // green
  };

  const sC = async (item: Case) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const sessionId = await startCase(item.id, item);
    if (sessionId) router.push(`/session/${sessionId}`);
  };

  const sections = {
    hero: (
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[TUM_DARK, TUM_BLUE]}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.heroContent}>
              <Surface style={styles.heroBadge} elevation={0}>
                <Text style={styles.heroBadgeText}>Institut für Allgemeinmedizin · TU München</Text>
              </Surface>
              <Text variant={isWeb ? 'displayMedium' : 'displaySmall'} style={styles.heroTitle}>
                KI-gestütztes{'\n'}
                <Text style={{ color: '#7ec8ff' }}>Anamnesetraining</Text>
              </Text>
              <Text variant="bodyLarge" style={styles.heroSubtitle}>
                Übe klinische Patientengespräche mit virtuellen KI-Patienten – jederzeit,
                ortsunabhängig und mit automatisiertem Feedback zu deinen kommunikativen und
                klinischen Kompetenzen.
              </Text>

              {!isWeb && (
                <Button
                  mode="contained"
                  onPress={() => requestScroll('cases')}
                  style={styles.heroMobileCta}
                  buttonColor="#fff"
                  textColor={TUM_DARK}
                  labelStyle={{ fontWeight: '800' }}
                >
                  Zu den Fällen
                </Button>
              )}

              <View style={styles.heroStats}>
                {[
                  { label: 'Fallszenarien', value: String(cases.length) },
                  { label: 'Bewertungsdimensionen', value: '8' },
                  { label: 'Wiederholungen', value: '∞' },
                  { label: 'Verfügbar', value: '24/7' },
                ].map((stat, i) => (
                  <View key={i} style={styles.heroStat}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    ),
    howto: (
      <View style={[styles.section, { backgroundColor: theme.colors.background }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              So funktioniert es
            </Text>
            <View style={styles.titleDivider} />
            <Text variant="bodyMedium" style={styles.sectionSub}>
              In vier Schritten zum vollständigen Anamnesegespräch
            </Text>
          </View>

          <View style={isWeb ? styles.stepsGridWeb : styles.stepsGridMobile}>
            {[
              {
                num: '1',
                icon: '🩺',
                title: 'Fall auswählen',
                desc: 'Wähle eines der sieben Fallszenarien aus unterschiedlichen allgemeinmedizinischen Beratungsanlässen.',
              },
              {
                num: '2',
                icon: '💬',
                title: 'Gespräch führen',
                desc: 'Führe die Anamnese per Text- oder Spracheingabe. Der KI-Patient antwortet realistisch auf Basis klinischer Skripte.',
              },
              {
                num: '3',
                icon: '📊',
                title: 'Feedback erhalten',
                desc: 'Nach dem Gespräch bekommst du ein detailliertes automatisiertes Feedback zu allen 8 Kompetenzdimensionen.',
              },
              {
                num: '4',
                icon: '🔄',
                title: 'Wiederholen & verbessern',
                desc: 'Wiederhole denselben Fall beliebig oft und verfolge deinen Fortschritt anhand deiner Scores.',
              },
            ].map((step, i) => (
              <Surface key={i} style={styles.stepCard} elevation={1}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepEmoji}>{step.icon}</Text>
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>{step.num}</Text>
                  </View>
                </View>
                <Text variant="titleMedium" style={styles.stepTitle}>
                  {step.title}
                </Text>
                <Text variant="bodySmall" style={styles.stepDesc}>
                  {step.desc}
                </Text>
              </Surface>
            ))}
          </View>
        </View>
      </View>
    ),
    functions: (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Funktionen
            </Text>
            <View style={styles.titleDivider} />
            <Text variant="bodyMedium" style={styles.sectionSub}>
              Zwei Eingabemodi für ein möglichst realistisches Gesprächserlebnis
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            {[
              {
                icon: '⌨️',
                title: 'Texteingabe',
                desc: 'Tippe deine Fragen und Antworten direkt ins Chatfenster. Ideal für eine durchdachte, strukturierte Gesprächsführung.',
              },
              {
                icon: '🎙️',
                title: 'Spracheingabe',
                beta: true,
                desc: 'Sprich deine Fragen direkt ins Mikrofon. Die Live-Funktion transkribiert in Echtzeit. (Beta: Einzelne Fehler möglich)',
              },
              {
                icon: '🤖',
                title: 'KI-Simulation',
                desc: 'Die virtuellen Patienten basieren auf klinisch validierten Krankheitsskripten und passen Sprache individuell an.',
              },
              {
                icon: '📋',
                title: 'Automatisches Feedback',
                desc: 'Nach jedem Gespräch erhältst du eine strukturierte Bewertung mit schriftlicher Begründung.',
              },
              {
                icon: '📱',
                title: 'Überall nutzbar',
                desc: 'Das System läuft vollständig im Browser oder als App – auf Laptop, Desktop oder Smartphone.',
              },
              {
                icon: '🔒',
                title: 'Anonym & Sicher',
                desc: 'Es werden keine personenbezogenen Daten erhoben. Die Nutzung erfolgt über anonyme IDs.',
              },
            ].map((feature, i) => (
              <View
                key={i}
                style={[styles.featureCard, isWeb ? { width: '31.5%' } : { width: '100%' }]}
              >
                <View style={styles.featureIconBox}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="titleMedium" style={styles.featureTitle}>
                      {feature.title}
                    </Text>
                    {feature.beta && (
                      <Surface style={styles.betaBadge} elevation={0}>
                        <Text style={styles.betaBadgeText}>LIVE</Text>
                      </Surface>
                    )}
                  </View>
                  <Text variant="bodySmall" style={styles.featureDesc}>
                    {feature.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    ),
    evaluation: (
      <View style={[styles.section, { backgroundColor: theme.colors.background }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Wie wird bewertet?
            </Text>
            <View style={styles.titleDivider} />
            <Text variant="bodyMedium" style={styles.sectionSub}>
              Die Bewertung basiert auf dem{' '}
              <Text style={{ fontWeight: '700' }}>
                Clinical Reasoning Interview – History Taking Scale (CRI-HTS)
              </Text>{' '}
              mit 8 Kompetenzdimensionen.
            </Text>
          </View>

          <View style={styles.evalGrid}>
            {[
              {
                d: '1',
                t: 'Gesprächsführung übernehmen',
                p: 'Begrüßung, offene Einstiegsfrage, Strukturierung.',
              },
              {
                d: '2',
                t: 'Relevante Informationen erkennen',
                p: 'Klinisch und psychosozial relevante Infos werden erkannt.',
              },
              {
                d: '3',
                t: 'Symptome präzisieren',
                p: 'Systematische Charakterisierung des Leitsymptoms (z.B. OPQRST).',
              },
              {
                d: '4',
                t: 'Pathophysiologisch denken',
                p: 'Gezielte Fragen zur Differenzialdiagnostik.',
              },
              {
                d: '5',
                t: 'Logische Gesprächsstruktur',
                p: 'Vom offenen Explorieren zur hypothesengeleiteten Präzisierung.',
              },
              {
                d: '6',
                t: 'Rückversicherung einholen',
                p: 'Aktive Überprüfung, ob der Patient sich verstanden fühlt.',
              },
              {
                d: '7',
                t: 'Zusammenfassen',
                p: 'Strukturierte Zusammenfassung in laiengerechter Sprache.',
              },
              {
                d: '8',
                t: 'Gesprächseffektivität beurteilen',
                p: 'Reflexion: Wurden gefährliche Diagnosen priorisiert?',
              },
            ].map((dim, i) => {
              const score = landingEvalScores[i] || 3;
              const barColor = getScaleColor(score);
              return (
                <Surface
                  key={i}
                  style={[styles.evalCard, isWeb ? { width: '23%' } : { width: '100%' }]}
                  elevation={1}
                >
                  <Text style={styles.evalDim}>Dimension {dim.d}</Text>
                  <Text variant="titleSmall" style={styles.evalTitle}>
                    {dim.t}
                  </Text>
                  <Text variant="bodySmall" style={styles.evalDesc}>
                    {dim.p}
                  </Text>
                  <View style={styles.evalStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <View
                        key={s}
                        style={[
                          styles.starBar,
                          s <= score && { backgroundColor: barColor },
                        ]}
                      />
                    ))}
                  </View>
                </Surface>
              );
            })}
          </View>

          <Surface style={styles.scaleInfo} elevation={0}>
            <Text style={styles.scaleInfoTitle}>Bewertungsskala:</Text>
            <View style={styles.scaleRow}>
              {[
                { color: '#ef4444', lbl: '1 – Nicht' },
                { color: '#f97316', lbl: '2 – Ansatzweise' },
                { color: '#eab308', lbl: '3 – Teilweise' },
                { color: '#84cc16', lbl: '4 – Weitgehend' },
                { color: '#22c55e', lbl: '5 – Vollständig' },
              ].map((item, i) => (
                <View key={i} style={styles.scaleItem}>
                  <View style={[styles.scaleDot, { backgroundColor: item.color }]} />
                  <Text style={styles.scaleItemText}>{item.lbl}</Text>
                </View>
              ))}
            </View>
          </Surface>
        </View>
      </View>
    ),
    cases: (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Fälle auswählen
            </Text>
            <View style={styles.titleDivider} />
            <Text variant="bodyMedium" style={styles.sectionSub}>
              Fallszenarien zu typischen allgemeinmedizinischen Beratungsanlässen
            </Text>
          </View>

          <View style={styles.casesGrid}>
            {cases.map((item, index) => {
              const mockDifficulty =
                index % 3 === 0 ? 'Leicht' : index % 3 === 1 ? 'Mittel' : 'Schwer';
              const diffStyle = getDifficultyStyle(mockDifficulty);

              const sessionInfo: { sessionId: string; score: number } = sessionScores[item.id];
              const score = sessionInfo ? sessionInfo.score : null;
              const hasScore = typeof score === 'number';

              return (
                <Surface
                  key={item.id}
                  elevation={2}
                  style={[styles.caseCard, isWeb ? { width: '31.5%' } : { width: '100%' }]}
                >
                  <TouchableRipple
                    onPress={async () => {
                      sC(item);
                    }}
                    style={{ flex: 1 }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.caseImageContainer}>
                        <Image
                          source={getCaseImage(item.imageName)}
                          style={styles.caseImage}
                          contentFit="cover"
                        />
                        <View style={[styles.diffBadge, { backgroundColor: diffStyle.bg }]}>
                          <Text style={{ color: diffStyle.text, fontSize: 11, fontWeight: '700' }}>
                            {mockDifficulty}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.caseTextContainer}>
                        <Text variant="titleMedium" style={styles.caseTitle}>
                          {item.title}
                        </Text>
                        <Text variant="bodySmall" style={styles.caseSubtext}>
                          {item.patientName}, {item.patientAge} J. {'\n'}
                          {item.patientOccupation}
                        </Text>
                      </View>

                      <View>
                        {hasScore && (
                          <View
                            style={[
                              styles.statusRow,
                              { borderTopColor: theme.colors.outlineVariant },
                            ]}
                          >
                            <Icon source="check-circle" color={getScoreColor(score)} size={14} />
                            <Text
                              variant="bodySmall"
                              style={{
                                color: getScoreColor(score),
                                marginLeft: 6,
                                fontWeight: '600',
                                marginTop: Platform.OS === 'web' ? 0 : 4,
                              }}
                            >
                              Absolviert • Letzter Score: {score.toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {hasScore ? (
                          <View style={styles.buttonRow}>
                            <Button
                              mode="contained-tonal"
                              onPress={() => {
                                const sessionInfo = sessionScores[item.id];
                                if (!sessionInfo || !sessionInfo.sessionId) return;
                                useSessionStore.setState({
                                  sessionId: sessionInfo.sessionId,
                                  evaluationResponse: undefined,
                                  waitingForEvaluationResponse: false,
                                });
                                useSessionStore.getState().evaluate();
                              }}
                              icon="chart-box-outline"
                              style={styles.halfWidthButton}
                              contentStyle={styles.buttonHeight}
                              labelStyle={styles.splitButtonLabel}
                            >
                              Ergebnis
                            </Button>
                            <Button
                              mode="contained"
                              onPress={async () => {
                                sC(item);
                              }}
                              icon="refresh"
                              style={styles.halfWidthButton}
                              contentStyle={styles.buttonHeight}
                              labelStyle={styles.splitButtonLabel}
                            >
                              Wiederholen
                            </Button>
                          </View>
                        ) : (
                          <Button
                            mode="contained"
                            onPress={async () => {
                              sC(item);
                            }}
                            icon="play"
                            style={styles.fullWidthButton}
                            contentStyle={styles.buttonHeight}
                            labelStyle={styles.fullButtonLabel}
                          >
                            Fall starten
                          </Button>
                        )}
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </View>

          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={styles.disclaimer}>
              ⚠️ Alle Inhalte dienen ausschließlich Lehr- und Ausbildungszwecken. Die KI-generierten
              Antworten sind nicht medizinisch validiert.
            </Text>
          </View>
        </View>
      </View>
    ),
  };

  return (
    <>
      <ScrollView style={styles.container} ref={scrollRef}>
        <Animated.View
          entering={FadeInUp.duration(800).delay(0).springify()}
          onLayout={onLayout('hero')}
        >
          {sections.hero}
        </Animated.View>
        <Animated.View
          entering={FadeInUp.duration(800).delay(200).springify()}
          onLayout={onLayout('howto')}
        >
          {sections.howto}
        </Animated.View>
        <Animated.View
          entering={FadeInUp.duration(800).delay(400).springify()}
          onLayout={onLayout('functions')}
        >
          {sections.functions}
        </Animated.View>
        <Animated.View
          entering={FadeInUp.duration(800).delay(600).springify()}
          onLayout={onLayout('evaluation')}
        >
          {sections.evaluation}
        </Animated.View>
        <Animated.View
          entering={FadeInUp.duration(800).delay(800).springify()}
          onLayout={onLayout('cases')}
        >
          {sections.cases}
        </Animated.View>
        <View style={{ height: 60 }} />
      </ScrollView>
      <EvaluationModal />
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentWrapper: {
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
      paddingHorizontal: 20,
    },
    heroContainer: {
      overflow: 'hidden',
    },
    heroGradient: {
      paddingVertical: 80,
      alignItems: 'center',
    },
    heroContent: {
      width: '100%',
      alignItems: 'center',
    },
    heroBadge: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    heroBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    heroMobileCta: {
      marginBottom: 24,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    heroTitle: {
      color: '#fff',
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: Platform.OS === 'web' ? undefined : 42,
    },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
      maxWidth: 800,
      alignSelf: 'center',
    },
    heroStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 30,
      marginTop: 20,
    },
    heroStat: {
      alignItems: 'center',
    },
    statValue: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '800',
    },
    statLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginTop: 4,
    },
    section: {
      paddingVertical: 80,
    },
    sectionHeader: {
      alignItems: 'center',
      marginBottom: 56,
    },
    sectionTitle: {
      fontWeight: '800',
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    titleDivider: {
      width: 60,
      height: 3,
      backgroundColor: TUM_BLUE,
      borderRadius: 3,
      marginTop: 10,
      marginBottom: 20,
    },
    sectionSub: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      maxWidth: 700,
      lineHeight: 24,
      marginTop: 4,
    },
    stepsGridWeb: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    stepsGridMobile: {
      flexDirection: 'column',
      gap: 16,
    },
    stepCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    stepIconContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    stepEmoji: {
      fontSize: 40,
    },
    stepNumBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: TUM_BLUE,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    stepNumText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    stepTitle: {
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    stepDesc: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'flex-start',
    },
    featureCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      flexDirection: 'row',
      gap: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    featureIconBox: {
      width: 48,
      height: 48,
      backgroundColor: theme.dark ? theme.colors.surfaceVariant : '#f3f4f6',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureEmoji: {
      fontSize: 24,
    },
    featureTitle: {
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    betaBadge: {
      backgroundColor: TUM_BLUE,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 8,
    },
    betaBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    featureDesc: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
      lineHeight: 18,
    },
    evalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    evalCard: {
      padding: 20,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    evalDim: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    evalTitle: {
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: 6,
    },
    evalDesc: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
    },
    evalStars: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 'auto',
      paddingTop: 12,
    },
    starBar: {
      height: 4,
      flex: 1,
      backgroundColor: theme.colors.outlineVariant,
      borderRadius: 2,
    },
    scaleInfo: {
      marginTop: 32,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    scaleInfoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.onPrimaryContainer,
      marginBottom: 10,
    },
    scaleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    scaleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    scaleDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    scaleItemText: {
      fontSize: 12,
      color: theme.colors.onPrimaryContainer,
    },
    casesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'flex-start',
    },
    caseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    caseImageContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1.5,
    },
    caseImage: {
      width: '100%',
      height: '100%',
    },
    diffBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    caseTextContainer: {
      padding: 16,
      flex: 1,
    },
    caseTitle: {
      fontWeight: '800',
      color: theme.colors.onSurface,
    },
    caseSubtext: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
    },
    halfWidthButton: {
      flex: 1,
      borderRadius: 0,
      margin: 0,
    },
    fullWidthButton: { width: '100%', borderRadius: 0, margin: 0 },
    buttonHeight: { height: 48, flexDirection: 'row-reverse' },
    fullButtonLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    splitButtonLabel: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    disclaimer: {
      fontSize: 12,
      color: theme.colors.outline,
      textAlign: 'center',
      maxWidth: 500,
    },
  });
