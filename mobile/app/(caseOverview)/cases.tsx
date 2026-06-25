import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Button, Text, useTheme, Surface, TouchableRipple, Icon } from 'react-native-paper';
import { useCasesStore } from '@/stores/useCasesStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { router } from 'expo-router';
import { Case, getCaseImage } from '@/lib/cases/case';
import EvaluationModal from '../components/EvaluationModal';

export default function CasesScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cases = useCasesStore((state) => state.cases);
  const loaded = useCasesStore((state) => state.loaded);
  const sessionScores = useCasesStore((state) => state.sessionScores);
  const loadAndGetCases = useCasesStore((state) => state.loadAndGetCases);
  const loadSessionSummaries = useCasesStore((state) => state.loadSessionSummaries);
  const startCase = useSessionStore((state) => state.startSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    void loadAndGetCases();
  }, [loadAndGetCases]);

  useEffect(() => {
    if (loaded) {
      void loadSessionSummaries();
    }
  }, [loaded, loadSessionSummaries]);

  const horizontalPadding = 16;
  const columnGap = 16;
  const columns = width >= 1100 ? 4 : width >= 780 ? 3 : width >= 520 ? 2 : 1;
  const cardWidth =
    columns === 1
      ? width - horizontalPadding * 2
      : (width - horizontalPadding * 2 - columnGap * (columns - 1)) / columns;

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'Leicht':
        return { bg: '#e8f7ef', text: '#0b7f5a' };
      case 'Schwer':
        return { bg: '#fcebea', text: '#d93025' };
      default:
        return { bg: '#fef3e5', text: '#d67e00' };
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

  return (
    <>
      <FlatList
        contentContainerStyle={styles.container}
        data={cases}
        key={columns}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        renderItem={({ item, index }) => {
          const mockDifficulty = index % 3 === 0 ? 'Leicht' : index % 3 === 1 ? 'Mittel' : 'Schwer';
          const sessionInfo: { sessionId: string; score: number } = sessionScores[item.id];
          const score = sessionInfo ? sessionInfo.score : null;
          const hasScore = typeof score === 'number';
          const diffStyle = getDifficultyStyle(mockDifficulty);

          return (
            <View
              style={[
                styles.cardShell,
                { width: cardWidth },
                columns === 1 ? styles.fullWidthCard : null,
              ]}
            >
              <Surface
                elevation={2}
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <TouchableRipple
                  style={{ flex: 1 }}
                  onPress={async () => {
                    sC(item);
                  }}
                >
                  <View style={styles.cardInnerFlex}>
                    {/* --- TOP HALF (Image) --- */}
                    <View style={styles.imageContainer}>
                      <Image
                        source={getCaseImage(item.imageName)}
                        style={styles.cardImage}
                        contentFit="cover"
                      />
                      <View style={[styles.difficultyBadge, { backgroundColor: diffStyle.bg }]}>
                        <Text style={{ color: diffStyle.text, fontSize: 12, fontWeight: '700' }}>
                          {mockDifficulty}
                        </Text>
                      </View>
                    </View>

                    {/* --- MIDDLE HALF (Text) --- */}
                    <View style={styles.textContainer}>
                      <Text variant="titleLarge" style={styles.cardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                      >
                        {item.patientName}, {item.patientAge} Jahre
                      </Text>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {item.patientOccupation}
                      </Text>
                    </View>

                    {/* --- BOTTOM HALF (Status + Action Buttons) --- */}
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
                              marginTop: 4,
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
                                case: item,
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
            </View>
          );
        }}
      />
      <EvaluationModal />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  columnWrapper: { gap: 16, alignItems: 'stretch' },
  cardShell: { display: 'flex' },
  fullWidthCard: { flexBasis: '100%' },
  card: { flex: 1, overflow: 'hidden', borderRadius: 16 },
  cardInnerFlex: { flex: 1, display: 'flex', flexDirection: 'column' },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', aspectRatio: 1.5, backgroundColor: '#E8E8E8' },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: { flex: 1, padding: 16, paddingBottom: 24 },
  cardTitle: { fontWeight: '700', fontSize: 20, lineHeight: 26 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row', // Places the two buttons side-by-side
    width: '100%',
  },
  halfWidthButton: {
    flex: 1, // Ensures both buttons take exactly 50% of the row
    borderRadius: 0,
    margin: 0,
  },
  fullWidthButton: { width: '100%', borderRadius: 0, margin: 0 },
  buttonHeight: { height: 48, flexDirection: 'row-reverse' },
  fullButtonLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  splitButtonLabel: {
    fontSize: 14, // Slightly smaller to ensure German words don't clip on small phones
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
