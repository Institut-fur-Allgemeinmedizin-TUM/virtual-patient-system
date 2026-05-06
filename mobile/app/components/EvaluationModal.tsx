import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Portal,
  Modal,
  Surface,
  Text,
  ActivityIndicator,
  Button,
  List,
  Divider,
  Avatar,
  useTheme,
} from 'react-native-paper';
import { useSessionStore } from '@/stores/useSessionStore';

export default function EvaluationModal() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const evaluation = useSessionStore((s) => s.evaluationResponse);
  const loading = useSessionStore((s) => s.waitingForEvaluationResponse);
  const resetEvaluation = useSessionStore((s) => s.resetEvaluation);

  const visible = Boolean(loading || evaluation);

  const close = () => {
    resetEvaluation();
  };

  const containerStyle = useMemo(() => {
    const isMobile = width < 768;
    return [
      styles.container,
      {
        width: isMobile ? width : Math.min(820, width - 48),
        maxHeight: Math.min(height - 80, 800),
        backgroundColor: theme.colors.surface,
      },
    ];
  }, [width, height, theme.colors.surface]);

  const getScoreColor = (score: number) => {
    if (score >= 4) return '#2ecc71'; // green
    if (score >= 3) return '#f39c12'; // orange
    return '#e74c3c'; // red
  };

  const calculateOverall = () => {
    if (!evaluation || !evaluation.criteria.length) return 0;
    const total = evaluation.criteria.reduce((s, c) => s + c.score, 0);
    return total / evaluation.criteria.length;
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={close} contentContainerStyle={styles.modalBackdrop}>
        <Surface style={containerStyle} elevation={2}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon
                size={40}
                icon="chart-bar"
                style={{ backgroundColor: theme.colors.primary }}
                color={theme.colors.onPrimary}
              />
              <View style={{ marginLeft: 16 }}>
                <Text
                  variant="titleLarge"
                  style={[styles.headerTitle, { color: theme.colors.primary }]}
                >
                  Anamnese-Evaluation
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Detailliertes Feedback zu Ihrer Gesprächsführung
                </Text>
              </View>
            </View>
          </View>

          <Divider />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: theme.colors.onSurface }}>
                Evaluation läuft …
              </Text>
            </View>
          ) : evaluation ? (
            <>
              <ScrollView contentContainerStyle={styles.content}>
                {/* OVERALL SCORE CARD */}
                <Surface
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.elevation.level1,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={styles.overallRow}>
                    {/* FIXED: Text color forced to onSurface so it's visible */}
                    <Text
                      variant="titleMedium"
                      style={{ fontWeight: 'bold', color: theme.colors.onSurface }}
                    >
                      Gesamtbewertung
                    </Text>
                    <View
                      style={[
                        styles.mainBadge,
                        { backgroundColor: getScoreColor(calculateOverall()) },
                      ]}
                    >
                      <Avatar.Icon
                        size={18}
                        icon="check-circle"
                        color="white"
                        style={{ backgroundColor: 'transparent' }}
                      />
                      <Text style={styles.mainBadgeText}>
                        {calculateOverall().toFixed(1)} / 5.0
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.progressBarBackground,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(calculateOverall() / 5) * 100}%`,
                          backgroundColor: getScoreColor(calculateOverall()),
                        },
                      ]}
                    />
                  </View>
                </Surface>

                <Text
                  variant="titleLarge"
                  style={[styles.sectionTitle, { color: theme.colors.primary }]}
                >
                  Bewertungskriterien
                </Text>

                {/* CRITERIA ACCORDIONS */}
                {evaluation.criteria.map((c, idx) => (
                  <Surface
                    key={idx}
                    // FIXED: Dynamic background and borders
                    style={[
                      styles.accordionCard,
                      {
                        backgroundColor: theme.colors.elevation.level1,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                    elevation={0}
                  >
                    <List.Accordion
                      title={c.name || `Kriterium ${idx + 1}`}
                      titleStyle={[styles.accordionTitle, { color: theme.colors.primary }]}
                      style={styles.accordionBase}
                      right={(props) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={[styles.smallBadge, { backgroundColor: getScoreColor(c.score) }]}
                          >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                              {c.score}/5
                            </Text>
                          </View>
                          <List.Icon
                            {...props}
                            icon={props.isExpanded ? 'chevron-up' : 'chevron-down'}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </View>
                      )}
                    >
                      <View
                        style={[
                          styles.expandedContent,
                          { borderTopColor: theme.colors.outlineVariant },
                        ]}
                      >
                        <Text
                          variant="labelMedium"
                          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
                        >
                          Bewertung:{' '}
                          {c.score >= 4 ? 'Gut' : c.score >= 3 ? 'Teilweise' : 'Eher nicht'}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          {c.explanation}
                        </Text>
                      </View>
                    </List.Accordion>
                  </Surface>
                ))}

                {/* IMPROVEMENT SUGGESTIONS CARD */}
                <Surface
                  style={[
                    styles.card,
                    {
                      marginTop: 16,
                      backgroundColor: theme.colors.primaryContainer,
                      borderColor: theme.colors.primary,
                      borderWidth: 1.5,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Avatar.Icon
                      size={32}
                      icon="lightbulb-on"
                      style={{ backgroundColor: theme.colors.primary }}
                      color={theme.colors.onPrimary}
                    />
                    <Text
                      variant="titleMedium"
                      style={{
                        marginLeft: 12,
                        fontWeight: 'bold',
                        color: theme.colors.onPrimaryContainer,
                      }}
                    >
                      Verbesserungsvorschläge
                    </Text>
                  </View>

                  {evaluation.improvement_suggestions.map((sug, i) => (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', marginBottom: 10, paddingRight: 12 }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          marginRight: 10,
                          fontSize: 18,
                          lineHeight: 22,
                        }}
                      >
                        •
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onPrimaryContainer, flex: 1, lineHeight: 22 }}
                      >
                        {sug}
                      </Text>
                    </View>
                  ))}
                </Surface>

                <View style={{ height: 24 }} />
              </ScrollView>

              {/* STICKY BOTTOM BUTTON */}
              <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
                <Button
                  mode="contained"
                  onPress={close}
                  style={{ borderRadius: 4 }}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  ZURÜCK ZUR FALLAUSWAHL
                </Button>
              </View>
            </>
          ) : null}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  mainBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  accordionCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accordionBase: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  accordionTitle: {
    fontWeight: 'bold',
  },
  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
