import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Avatar, Button, IconButton, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import EvaluationModal from '../components/EvaluationModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '@/stores/useSessionStore';
import { getCaseImage } from '@/lib/cases/case';
import React from 'react';

type SessionProfile = {
  title: string;
  subtitle: string;
  summary: string;
  openingHint: string;
  guidance: string[];
};

function getSessionProfile(sessionId: string): SessionProfile {
  return {
    title: 'Mock Session',
    subtitle: `Platzhalter für spätere Backend-Daten`,
    summary: 'All displayed content in this screen is temporary mock data.',
    openingHint:
      'Starten Sie mit einer offenen, neutralen Frage und führen Sie das Gespräch strukturiert weiter.',
    guidance: [
      'Nutzen Sie allgemeine, offene Fragen als Einstieg.',
      'Halten Sie das Gespräch strukturiert und verständlich.',
      'Die echten Inhalte werden später vom Backend geladen.',
    ],
  };
}

export default function SessionScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId =
    typeof params.sessionId === 'string'
      ? params.sessionId
      : (params.sessionId?.[0] ?? 'demo-session');

  const profile = useMemo(() => getSessionProfile(sessionId), [sessionId]);
  const session = useSessionStore((state) => state);
  session.sessionId = sessionId; // Ensure session ID is set in store for API calls
  const loadSession = useSessionStore((state) => state.loadSession);

  const isBotTyping = session.waitingForBotresponse ?? false;

  const [draft, setDraft] = useState('');
  const messageScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session.loaded) {
      void loadSession();
    }
  }, [loadSession, session.loaded]);

  useEffect(() => {
    messageScrollRef.current?.scrollToEnd({ animated: true });
  }, [isBotTyping]);

  // Layout Calculations
  const isMobile = width <= 768;
  const sessionWidth = isMobile ? '100%' : Math.min(width - 24, 980);
  const canSend = draft.trim().length > 0 && !isBotTyping;

  const sendMessage = () => {
    if (!canSend) return;
    // Add user message to chat history
    setDraft('');
    session.chat(draft);
  };

  const handleComposerKeyPress = (event: { nativeEvent: { key: string; shiftKey?: boolean } }) => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
      sendMessage();
    }
  };
  const canEvaluate =
    session.chatHistory &&
    session.chatHistory.length >= 10 &&
    !session.waitingForEvaluationResponse &&
    !isBotTyping;
  const evaluate = () => {
    if (canEvaluate) {
      session.evaluate();
    }
  };

  if (!session.loaded) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={['bottom']}
      >
        <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.page,
            {
              paddingVertical: isMobile ? 0 : 12,
              paddingHorizontal: isMobile ? 0 : 12,
            },
          ]}
        >
          {/* Replaced Card with Surface to enforce strict Flexbox stretching */}
          <Surface
            elevation={1}
            style={[
              styles.chatSurface,
              {
                width: sessionWidth,
                borderRadius: isMobile ? 0 : 12,
              },
            ]}
          >
            <View style={styles.chatHeader}>
              <Avatar.Image size={40} source={getCaseImage(session.case!.imageName)} />
              <View style={styles.chatHeaderTitle}>
                <Text variant="titleMedium">Chat: {session.case?.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {session.case?.patientName}, {session.case?.patientAge} Jahre,{' '}
                  {session.case?.patientOccupation}
                </Text>
              </View>
              <Button
                icon="chart-box-outline"
                style={styles.evaluateButton}
                compact={true}
                mode="outlined"
                onPress={() => evaluate()}
                disabled={!canEvaluate}
                loading={session.waitingForEvaluationResponse}
              >
                Evaluate
              </Button>
            </View>

            <View style={styles.chatBody}>
              <ScrollView
                ref={messageScrollRef}
                style={styles.messagePane}
                contentContainerStyle={styles.messagePaneContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.chatIntroBlock}>
                  <View style={styles.chatIconCenter}>
                    <Avatar.Icon size={40} icon="chat-outline" />
                  </View>
                  <Text
                    variant="headlineSmall"
                    style={[styles.chatIntroTitle, { color: theme.colors.onSurface }]}
                  >
                    Gespräch gestartet!
                  </Text>
                </View>

                <Surface
                  elevation={0}
                  style={[styles.infoBubble, { backgroundColor: theme.colors.primaryContainer }]}
                >
                  <View style={styles.infoBubbleHeader}>
                    <Avatar.Icon size={24} icon="lightbulb-outline" />
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer }}>
                      Tipps für ein gutes Gespräch:
                    </Text>
                  </View>
                  <View style={styles.tipsBlock}>
                    {profile.guidance.map((item, index) => (
                      <View key={`${sessionId}-${index}`} style={styles.tipRow}>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onPrimaryContainer, marginRight: 8 }}
                        >
                          •
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[styles.tipText, { color: theme.colors.onPrimaryContainer }]}
                        >
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Surface>

                {session.chatHistory!.map((message) => (
                  <View
                    key={1}
                    style={[
                      styles.messageRow,
                      message.role === 'user' ? styles.userRow : styles.assistantRow,
                    ]}
                  >
                    <Surface
                      elevation={0}
                      style={[
                        styles.bubble,
                        message.role === 'user'
                          ? [styles.userBubble, { backgroundColor: theme.colors.primaryContainer }]
                          : [
                              styles.assistantBubble,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ],
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        style={{
                          color:
                            message.role === 'user'
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurfaceVariant,
                        }}
                      >
                        {message.text}
                      </Text>
                    </Surface>
                  </View>
                ))}

                {isBotTyping && (
                  <View style={[styles.messageRow, styles.assistantRow]}>
                    <Surface
                      elevation={0}
                      style={[
                        styles.bubble,
                        styles.assistantBubble,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    >
                      <View style={styles.typingRow}>
                        <ActivityIndicator size="small" />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Bot schreibt ...
                        </Text>
                      </View>
                    </Surface>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Input Composer Pinned to Bottom */}
            <View style={[styles.composer, { borderTopColor: theme.colors.outlineVariant }]}>
              <TextInput
                mode="outlined"
                value={draft}
                disabled={isBotTyping}
                onChangeText={setDraft}
                onKeyPress={handleComposerKeyPress}
                placeholder="Schreiben Sie eine Nachricht ..."
                multiline
                style={styles.composerInput}
                dense
                returnKeyType="send"
              />
              <IconButton
                icon="send"
                mode="contained-tonal"
                size={20}
                onPress={() => {
                  sendMessage();
                }}
                disabled={!canSend}
                accessibilityLabel="Nachricht senden"
              />
            </View>

            <Button
              mode="text"
              icon="information-outline"
              compact
              style={styles.footerHint}
              labelStyle={{ textAlign: 'left' }}
            >
              Antworten sind KI generiert!
            </Button>
          </Surface>
        </View>
      </KeyboardAvoidingView>
      <EvaluationModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    height: '100%',
  },
  flex: {
    flex: 1,
    height: '100%',
  },
  page: {
    flex: 1,
    height: '100%',
    alignSelf: 'center',
    width: '100%',
  },
  chatSurface: {
    flex: 1, // Forces Surface to expand into page height
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  chatHeaderTitle: {
    marginLeft: 16,
    justifyContent: 'center',
    flex: 1,
  },
  evaluateButton: {
    marginLeft: 'auto',
  },
  chatBody: {
    flex: 1, // Forces scroll view container to take all available middle space
    display: 'flex',
  },
  messagePane: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagePaneContent: {
    flexGrow: 1, // Ensures empty space is respected for scrolling layout
    gap: 10,
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  assistantBubble: {
    borderTopLeftRadius: 6,
  },
  userBubble: {
    borderTopRightRadius: 6,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
  },
  footerHint: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 8,
    marginBottom: 4,
  },
  chatIntroBlock: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chatIconCenter: {
    alignItems: 'center',
    marginBottom: 8,
  },
  chatIntroTitle: {
    fontWeight: '700',
  },
  infoBubble: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsBlock: {
    marginTop: 10,
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
  },
});
