import React, { useEffect, useMemo, useState } from 'react';
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
  const evaluationMessages = useSessionStore((s) => s.evaluationMessages);
  const loadingMessages = useSessionStore((s) => s.waitingForEvaluationMessages);
  const messagesError = useSessionStore((s) => s.evaluationMessagesError);
  const loadEvaluationMessages = useSessionStore((s) => s.loadEvaluationMessages);
  const resetEvaluation = useSessionStore((s) => s.resetEvaluation);
  const [showTranscript, setShowTranscript] = useState(false);

  const visible = Boolean(loading || evaluation);

  useEffect(() => {
    setShowTranscript(false);
  }, [evaluation?.session_id]);

  useEffect(() => {
    if (!showTranscript || !evaluation?.session_id) {
      return;
    }

    void loadEvaluationMessages(evaluation.session_id);
  }, [evaluation?.session_id, loadEvaluationMessages, showTranscript]);

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
            <View style={styles.headerTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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

               

                <Surface
                  style={[
                    styles.card,
                    styles.transcriptCard,
                    {
                      backgroundColor: theme.colors.elevation.level1,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  elevation={0}
                >
                  <List.Accordion
                    title="Gesprächsverlauf"
                    description="Einsehbar, falls Sie einzelne Antworten nachverfolgen möchten"
                    expanded={showTranscript}
                    onPress={() => setShowTranscript((prev) => !prev)}
                    titleStyle={{ color: theme.colors.primary, fontWeight: '700' }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    style={styles.transcriptAccordion}
                    right={(props) => (
                      loadingMessages ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <List.Icon
                          {...props}
                          icon={showTranscript ? 'chevron-up' : 'chevron-down'}
                          color={theme.colors.onSurfaceVariant}
                        />
                      )
                    )}
                  >
                    <View
                      style={[
                        styles.transcriptContent,
                        { borderTopColor: theme.colors.outlineVariant },
                      ]}
                    >
                      {messagesError ? (
                        <Surface
                          elevation={0}
                          style={[
                            styles.transcriptMessageError,
                            { backgroundColor: theme.colors.errorContainer },
                          ]}
                        >
                          <Text style={{ color: theme.colors.onErrorContainer }}>
                            {messagesError}
                          </Text>
                          <Button
                            mode="text"
                            onPress={() => void loadEvaluationMessages(evaluation.session_id, true)}
                            textColor={theme.colors.error}
                          >
                            Erneut laden
                          </Button>
                        </Surface>
                      ) : !loadingMessages && evaluationMessages.length === 0 ? (
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          Für diese Sitzung liegen keine sichtbaren Nachrichten vor.
                        </Text>
                      ) : (
                        <ScrollView
                          style={styles.transcriptMessagesScroll}
                          contentContainerStyle={styles.transcriptMessagesWrap}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator
                        >
                          {evaluationMessages.map((message, index) => {
                            const isUser = message.role === 'user';
                            return (
                              <View
                                key={`eval-transcript-${index}`}
                                style={[
                                  styles.transcriptMessageRow,
                                  isUser ? styles.transcriptMessageRowUser : styles.transcriptMessageRowBot,
                                ]}
                              >
                                <Surface
                                  elevation={0}
                                  style={[
                                    styles.transcriptMessageBubble,
                                    {
                                      backgroundColor: isUser
                                        ? theme.colors.primaryContainer
                                        : theme.colors.surfaceVariant,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: isUser
                                        ? theme.colors.onPrimaryContainer
                                        : theme.colors.onSurfaceVariant,
                                      lineHeight: 20,
                                    }}
                                  >
                                    {message.text}
                                  </Text>
                                </Surface>
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </List.Accordion>
                </Surface>


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
    padding: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTranscriptButton: {
    borderRadius: 18,
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
  transcriptCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
  },
  transcriptAccordion: {
    backgroundColor: 'transparent',
  },
  transcriptContent: {
    borderTopWidth: 1,
    padding: 12,
  },
  transcriptMessagesScroll: {
    maxHeight: 550,
  },
  transcriptMessagesWrap: {
    paddingBottom: 12,
  },
  transcriptMessageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  transcriptMessageRowUser: {
    justifyContent: 'flex-end',
  },
  transcriptMessageRowBot: {
    justifyContent: 'flex-start',
  },
  transcriptMessageBubble: {
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  transcriptMessageError: {
    borderRadius: 8,
    padding: 12,
    gap: 8,
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
