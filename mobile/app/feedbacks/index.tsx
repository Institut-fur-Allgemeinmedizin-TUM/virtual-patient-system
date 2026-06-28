import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Surface,
  Text,
  useTheme,
  TouchableRipple,
  Portal,
  Dialog,
  Button,
  IconButton,
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import EvaluationModal from '@/app/components/EvaluationModal';
import { FeedBackMarkerType } from '@/services/api';

const MarkerSelector = ({ item, markFeedback }: { item: any, markFeedback: any }) => {
  const [visible, setVisible] = useState(false);

  const getIcon = (marker: string) => {
    switch (marker) {
      case FeedBackMarkerType.Read:
        return 'check-circle';
      case FeedBackMarkerType.Important:
        return 'alert-circle';
      case FeedBackMarkerType.LookAgain:
        return 'eye';
      default:
        return 'help-circle-outline';
    }
  };

  const getColor = (marker: string) => {
    switch (marker) {
      case FeedBackMarkerType.Read:
        return '#4caf50';
      case FeedBackMarkerType.Important:
        return '#f44336';
      case FeedBackMarkerType.LookAgain:
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon={getIcon(item.marker || FeedBackMarkerType.None)}
          iconColor={getColor(item.marker || FeedBackMarkerType.None)}
          size={20}
          onPress={() => setVisible(true)}
        />
      }
    >
      <Menu.Item onPress={() => { markFeedback(item.session_id, FeedBackMarkerType.None); setVisible(false); }} title="None" />
      <Menu.Item onPress={() => { markFeedback(item.session_id, FeedBackMarkerType.Read); setVisible(false); }} title="Read" />
      <Menu.Item onPress={() => { markFeedback(item.session_id, FeedBackMarkerType.Important); setVisible(false); }} title="Important" />
      <Menu.Item onPress={() => { markFeedback(item.session_id, FeedBackMarkerType.LookAgain); setVisible(false); }} title="Look Again" />
    </Menu>
  );
};

const FeedbacksDashboard = () => {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const fetchAllFeedbacks = useSessionStore((state) => state.fetchAllFeedbacks);
  const allFeedbacks = useSessionStore((state) => state.allFeedbacks);
  const totalFeedbacks = useSessionStore((state) => state.totalFeedbacks);
  const markFeedback = useSessionStore((state) => state.markFeedback);

  const [expandedText, setExpandedText] = useState<{ title: string; content: string } | null>(null);

  const [filterMarker, setFilterMarker] = useState<string>('all');

  const [page, setPage] = useState(0);
  const itemsPerPage = 100;

  if (!user?.roles?.includes('Admin')) {
    router.replace('/unauthorized');
  }

  useEffect(() => {
    fetchAllFeedbacks(
      itemsPerPage,
      page * itemsPerPage,
      filterMarker !== 'all' ? (filterMarker as FeedBackMarkerType) : undefined
    );
  }, [fetchAllFeedbacks, page, itemsPerPage, filterMarker]);

  const openEvaluationForSession = (sessionIdValue: unknown) => {
    const sessionId = String(sessionIdValue ?? '').trim();
    if (!sessionId) {
      return;
    }

    useSessionStore.setState({
      sessionId,
      evaluationResponse: undefined,
      waitingForEvaluationResponse: false,
      evaluationMessages: [],
      waitingForEvaluationMessages: false,
      evaluationMessagesError: undefined,
    });

    useSessionStore.getState().evaluate();
  };

  const palette = useMemo(
    () => ({
      background: theme.colors.background,
      surface: theme.colors.surface,
      headerSurface: theme.colors.elevation.level2,
      border: theme.colors.outlineVariant,
      title: theme.colors.onBackground,
      subtitle: theme.colors.onSurfaceVariant,
      text: theme.colors.onSurface,
    }),
    [theme],
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text variant="headlineMedium" style={[styles.pageTitle, { color: palette.title }]}>
        Feedbacks Overview
      </Text>

      <View style={{ marginBottom: 16 }}>
        <SegmentedButtons
          value={filterMarker}
          onValueChange={(val) => {
            setFilterMarker(val);
            setPage(0);
          }}
          buttons={[
            { value: 'all', label: 'All' },
            { value: FeedBackMarkerType.None, label: 'None' },
            { value: FeedBackMarkerType.Read, label: 'Read' },
            { value: FeedBackMarkerType.Important, label: 'Important' },
            { value: FeedBackMarkerType.LookAgain, label: 'Look Again' },
          ]}
        />
      </View>

      <Surface
        style={[
          styles.tableSurface,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        elevation={1}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.tableWrapper, { minWidth: Dimensions.get('window').width - 40 }]}>
            <View style={[styles.columnWrapper, { borderRightColor: palette.border, width: 300 }]}>
              <View
                style={[
                  styles.headerCell,
                  { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                ]}
              >
                <Text style={[styles.headerLabel, { color: palette.subtitle }]} numberOfLines={1}>
                  Session ID
                </Text>
              </View>
              {allFeedbacks.map((item, index) => (
                <View
                  key={`session-${item.session_id || index}`}
                  style={[styles.dataCell, { borderBottomColor: palette.border }]}
                >
                  <Text numberOfLines={1} style={{ color: palette.text }}>
                    {item.session_id}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.columnWrapper, { borderRightColor: palette.border, width: 100 }]}>
              <View
                style={[
                  styles.headerCell,
                  { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                ]}
              >
                <Text style={[styles.headerLabel, { color: palette.subtitle }]} numberOfLines={1}>
                  Score
                </Text>
              </View>
              {allFeedbacks.map((item, index) => (
                <View
                  key={`score-${item.session_id || index}`}
                  style={[styles.dataCell, { borderBottomColor: palette.border }]}
                >
                  <Text numberOfLines={1} style={{ color: palette.text }}>
                    {item.feedback_score}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.columnWrapper, { borderRightColor: palette.border, width: 600 }]}>
              <View
                style={[
                  styles.headerCell,
                  { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                ]}
              >
                <Text style={[styles.headerLabel, { color: palette.subtitle }]} numberOfLines={1}>
                  Comment
                </Text>
              </View>
              {allFeedbacks.map((item, index) => (
                <TouchableRipple
                  key={`comment-${item.session_id || index}`}
                  style={[styles.dataCell, { borderBottomColor: palette.border }]}
                  onPress={() => {
                    if (item.feedback_comment) {
                      setExpandedText({
                        title: 'Feedback Comment',
                        content: item.feedback_comment,
                      });
                    }
                  }}
                >
                  <Text numberOfLines={1} style={{ color: palette.text }}>
                    {item.feedback_comment || '-'}
                  </Text>
                </TouchableRipple>
              ))}
            </View>

            <View style={[styles.columnWrapper, { borderRightColor: palette.border, width: 100 }]}>
              <View
                style={[
                  styles.headerCell,
                  { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                ]}
              >
                <Text style={[styles.headerLabel, { color: palette.subtitle }]} numberOfLines={1}>
                  Marker
                </Text>
              </View>
              {allFeedbacks.map((item, index) => (
                <View
                  key={`marker-${item.session_id || index}`}
                  style={[styles.dataCell, { borderBottomColor: palette.border, alignItems: 'center' }]}
                >
                  <MarkerSelector item={item} markFeedback={markFeedback} />
                </View>
              ))}
            </View>

            <View
              style={[
                styles.columnWrapper,
                { borderRightColor: palette.border, width: 80, borderRightWidth: 0 },
              ]}
            >
              <View
                style={[
                  styles.headerCell,
                  {
                    backgroundColor: palette.headerSurface,
                    borderBottomColor: palette.border,
                    justifyContent: 'center',
                    paddingLeft: 0,
                  },
                ]}
              >
                <Text style={[styles.headerLabel, { color: palette.subtitle }]} numberOfLines={1}>
                  Actions
                </Text>
              </View>
              {allFeedbacks.map((item, index) => (
                <View
                  key={`action-${item.session_id || index}`}
                  style={[
                    styles.dataCell,
                    {
                      borderBottomColor: palette.border,
                      alignItems: 'center',
                      paddingHorizontal: 0,
                    },
                  ]}
                >
                  <IconButton
                    icon="chart-box-outline"
                    size={18}
                    mode="contained-tonal"
                    onPress={() => openEvaluationForSession(item.session_id)}
                    disabled={!item.session_id}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Surface>

      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={page === 0}
          onPress={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <Text style={[styles.paginationText, { color: palette.text }]}>
          Page {page + 1} of {Math.max(1, Math.ceil(totalFeedbacks / itemsPerPage))}
        </Text>
        <Button
          mode="outlined"
          disabled={(page + 1) * itemsPerPage >= totalFeedbacks}
          onPress={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={!!expandedText}
          onDismiss={() => setExpandedText(null)}
          style={{ backgroundColor: palette.surface }}
        >
          <Dialog.Title style={{ color: palette.title }}>{expandedText?.title}</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={{ color: palette.text }}>{expandedText?.content}</Text>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExpandedText(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <EvaluationModal />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: 16 },
  pageTitle: { fontWeight: 'bold', marginBottom: 20 },
  tableSurface: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tableWrapper: {
    flexDirection: 'row',
  },
  columnWrapper: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLabel: {
    fontWeight: 'bold',
    fontSize: 13,
    flexShrink: 1,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  paginationText: {
    marginHorizontal: 16,
    fontWeight: '600',
  },
});

export default function App() {
  return <FeedbacksDashboard />;
}
