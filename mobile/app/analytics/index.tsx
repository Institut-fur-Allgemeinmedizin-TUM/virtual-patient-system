import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import {
  Surface,
  Text,
  IconButton,
  Menu,
  useTheme,
  TouchableRipple,
  Portal,
  Dialog,
  Button,
  Searchbar,
  Snackbar,
  SegmentedButtons,
} from 'react-native-paper';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import { useCasesStore } from '@/stores/useCasesStore';
import { useSessionStore } from '@/stores/useSessionStore';
import EvaluationModal from '@/app/components/EvaluationModal';
import { EvaluationBarChart } from '@/app/components/EvaluationBarChart';
import { EvaluationRadarChart } from '@/app/components/EvaluationRadarChart';
import { CorrelationScatterPlot } from '@/app/components/CorrelationScatterPlot';
import { ScoreDistributionChart } from '@/app/components/ScoreDistributionChart';
import {
  SortDirection,
  SessionHistoryOrderBy,
  SessionHistoryFilter,
  SessionHistoryColumn,
} from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

// ==========================================
// 1. DYNAMIC TABLE TYPES & DATA
// ==========================================

type ColumnId = SessionHistoryColumn;

interface ColumnDef {
  id: ColumnId;
  label: string;
}

interface CaseOption {
  label: string;
  value: string;
}

const ALL_CASES_VALUE = '__all__';

const PREDEFINED_COLUMNS: ColumnDef[] = [
  { id: SessionHistoryColumn.Id, label: 'Session ID' },
  { id: SessionHistoryColumn.Case, label: 'Case' },
  { id: SessionHistoryColumn.EndedAt, label: 'End Date' },
  { id: SessionHistoryColumn.StartedAt, label: 'Start Date' },
  { id: SessionHistoryColumn.Criterion1Score, label: 'Criterion 1 Score' },
  { id: SessionHistoryColumn.Criterion1Explanation, label: 'Criterion 1 Explanation' },
  { id: SessionHistoryColumn.Criterion2Score, label: 'Criterion 2 Score' },
  { id: SessionHistoryColumn.Criterion2Explanation, label: 'Criterion 2 Explanation' },
  { id: SessionHistoryColumn.Criterion3Score, label: 'Criterion 3 Score' },
  { id: SessionHistoryColumn.Criterion3Explanation, label: 'Criterion 3 Explanation' },
  { id: SessionHistoryColumn.Criterion4Score, label: 'Criterion 4 Score' },
  { id: SessionHistoryColumn.Criterion4Explanation, label: 'Criterion 4 Explanation' },
  { id: SessionHistoryColumn.Criterion5Score, label: 'Criterion 5 Score' },
  { id: SessionHistoryColumn.Criterion5Explanation, label: 'Criterion 5 Explanation' },
  { id: SessionHistoryColumn.Criterion6Score, label: 'Criterion 6 Score' },
  { id: SessionHistoryColumn.Criterion6Explanation, label: 'Criterion 6 Explanation' },
  { id: SessionHistoryColumn.Criterion7Score, label: 'Criterion 7 Score' },
  { id: SessionHistoryColumn.Criterion7Explanation, label: 'Criterion 7 Explanation' },
  { id: SessionHistoryColumn.Criterion8Score, label: 'Criterion 8 Score' },
  { id: SessionHistoryColumn.Criterion8Explanation, label: 'Criterion 8 Explanation' },
  { id: SessionHistoryColumn.LiveTimeUsed, label: 'Live Time Used (s)' },
  { id: SessionHistoryColumn.UserWordCount, label: 'User Word Count' },
  { id: SessionHistoryColumn.DurationMinutes, label: 'Duration (min)' },
];

// ==========================================
// 3. MAIN DASHBOARD SCREEN
// ==========================================

const AnalyticsDashboard = () => {
  const theme = useTheme();
  const [selectedCase, setSelectedCase] = useState<string>(ALL_CASES_VALUE);
  const [page, setPage] = useState(0);
  const itemsPerPage = 25;
  // Table State
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Desc);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([
    SessionHistoryColumn.Case,
    SessionHistoryColumn.EndedAt,
    SessionHistoryColumn.Criterion1Score,
    SessionHistoryColumn.Criterion2Score,
    SessionHistoryColumn.Criterion3Score,
    SessionHistoryColumn.Criterion4Score,
    SessionHistoryColumn.Criterion5Score,
    SessionHistoryColumn.Criterion6Score,
    SessionHistoryColumn.Criterion7Score,
    SessionHistoryColumn.Criterion8Score,
  ]);
  const [expandedText, setExpandedText] = useState<{ title: string; content: string } | null>(null);

  const [columnMenuState, setColumnMenuState] = useState<Record<string, boolean>>({});
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState<ColumnId>(SessionHistoryColumn.Id);

  // Toggle for top overview chart
  const [overviewChartType, setOverviewChartType] = useState<'radar' | 'bar'>('radar');

  const dashboardOverview = useAnalyticsStore((state) => state.dashboardOverview);
  const loadDashboardOverview = useAnalyticsStore((state) => state.loadDashboardOverview);
  const sessionRecords = useAnalyticsStore((state) => state.sessionRecords);
  const graphRecords = useAnalyticsStore((state) => state.graphRecords);
  const loadGraphRecords = useAnalyticsStore((state) => state.loadGraphRecords);
  const loadSessionRecords = useAnalyticsStore((state) => state.loadSessionRecords);
  const totalSessionRecords = useAnalyticsStore((state) => state.totalSessionRecords);
  const downloadCSV = useAnalyticsStore((state) => state.downloadCSV);
  const user = useAuthStore((state) => state.user);
  const isDownloadingCSV = useAnalyticsStore((state) => state.isDownloadingCSV);
  const analyticsError = useAnalyticsStore((state) => state.analyticsError);
  const clearAnalyticsError = useAnalyticsStore((state) => state.clearAnalyticsError);
  const cases = useCasesStore((state) => state.cases);
  const loadAndGetCases = useCasesStore((state) => state.loadAndGetCases);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const router = useRouter();

  if (!user?.roles?.includes('Admin')) {
    //Redirect
    router.replace('/unauthorized');
  }

  useEffect(() => {
    loadAndGetCases();
  }, [loadAndGetCases]);

  useEffect(() => {
    const orderBy: SessionHistoryOrderBy[] = sortColumn
      ? [{ column: sortColumn, direction: sortDirection }]
      : [];

    const filters: SessionHistoryFilter[] = [];
    if (selectedCase !== ALL_CASES_VALUE) {
      filters.push({ column: SessionHistoryColumn.Case, value: selectedCase });
    }
    if (searchQuery.trim()) {
      // Use % for partial match as supported by updated backend
      filters.push({
        column: searchColumn as SessionHistoryColumn,
        value: `%${searchQuery.trim()}%`,
      });
    }

    loadSessionRecords(itemsPerPage, page * itemsPerPage, orderBy, filters);
  }, [
    page,
    sortColumn,
    sortDirection,
    loadSessionRecords,
    selectedCase,
    searchQuery,
    searchColumn,
  ]);

  useEffect(() => {
    const caseId = selectedCase === ALL_CASES_VALUE ? undefined : selectedCase;
    loadDashboardOverview(caseId);
    loadGraphRecords(caseId);
  }, [selectedCase, loadDashboardOverview, loadGraphRecords]);

  useEffect(() => {
    if (analyticsError) {
      setSnackbarMessage(analyticsError.message);
      setSnackbarVisible(true);
    }
  }, [analyticsError]);

  const caseOptions = useMemo<CaseOption[]>(() => {
    const dynamicOptions = cases.map((item) => ({
      label: item.title || item.id,
      value: item.id,
    }));

    return [{ label: 'All Cases', value: ALL_CASES_VALUE }, ...dynamicOptions];
  }, [cases]);

  const searchColumnOptions = useMemo(() => {
    return PREDEFINED_COLUMNS.map((col) => ({
      label: col.label,
      value: col.id,
    }));
  }, []);

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

  // Table Handlers
  const handleSort = (colId: ColumnId) => {
    if (sortColumn === colId) {
      if (sortDirection === SortDirection.Asc) {
        setSortDirection(SortDirection.Desc);
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colId);
      setSortDirection(SortDirection.Asc);
    }
    setPage(0);
  };

  const removeColumn = (colId: ColumnId) => {
    setVisibleColumns(visibleColumns.filter((id) => id !== colId));
    toggleColumnMenu(colId, false);
  };

  const addColumn = (colId: ColumnId) => {
    setVisibleColumns([...visibleColumns, colId]);
    setAddMenuVisible(false);
  };

  const toggleColumnMenu = (colId: string, visible: boolean) => {
    setColumnMenuState((prev) => ({ ...prev, [colId]: visible }));
  };

  const hiddenColumns = PREDEFINED_COLUMNS.filter((c) => !visibleColumns.includes(c.id));

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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text variant="headlineMedium" style={[styles.pageTitle, { color: palette.title }]}>
        Dashboard Overview
      </Text>
      <View style={{ gap: 12, marginBottom: 20 }}>
        <Dropdown
          style={[
            styles.timeRangeDropdown,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          placeholder="Select Case"
          data={caseOptions}
          labelField="label"
          valueField="value"
          value={selectedCase}
          placeholderStyle={[styles.timeRangePlaceholder, { color: palette.subtitle }]}
          selectedTextStyle={[styles.timeRangeSelectedText, { color: palette.text }]}
          iconStyle={[styles.timeRangeIcon, { tintColor: palette.subtitle }]}
          containerStyle={[
            styles.timeRangeMenu,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          itemContainerStyle={{ borderRadius: 10 }}
          itemTextStyle={{ color: palette.text }}
          activeColor={theme.dark ? theme.colors.elevation.level3 : theme.colors.elevation.level1}
          onChange={(item: CaseOption) => {
            setSelectedCase(item.value);
            setPage(0);
          }}
        />
      </View>

      {/* --- Top Section: Overview Charts --- */}
      {dashboardOverview?.avg_scores && (
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
            <SegmentedButtons
              value={overviewChartType}
              onValueChange={(val) => setOverviewChartType(val as 'radar' | 'bar')}
              buttons={[
                { value: 'radar', label: 'Skills Web', icon: 'spider-web' },
                { value: 'bar', label: 'Bar Chart', icon: 'chart-bar' },
              ]}
              style={{ maxWidth: 350 }}
            />
          </View>
          {overviewChartType === 'radar' ? (
            <EvaluationRadarChart
              scores={dashboardOverview.avg_scores as Record<string, number>}
              maxScore={5}
            />
          ) : (
            <EvaluationBarChart
              scores={dashboardOverview.avg_scores as Record<string, number>}
              maxScore={5}
            />
          )}
        </View>
      )}

      {/* --- Middle Section: Advanced Analytics --- */}
      {graphRecords && graphRecords.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <CorrelationScatterPlot records={graphRecords} />
          <ScoreDistributionChart records={graphRecords} />
        </View>
      )}

      {/* --- Bottom Section: Column-Oriented Data Table --- */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 12,
        }}
      >
        <Text
          variant="titleLarge"
          style={[styles.sectionTitle, { color: palette.title, marginTop: 0, marginBottom: 0 }]}
        >
          Detailed Records
        </Text>
        <Button
          mode="contained-tonal"
          icon="download"
          loading={isDownloadingCSV}
          disabled={isDownloadingCSV}
          onPress={() => {
            const orderBy: SessionHistoryOrderBy[] = sortColumn
              ? [{ column: sortColumn, direction: sortDirection }]
              : [];

            const filters: SessionHistoryFilter[] = [];
            if (searchQuery.trim()) {
              filters.push({
                column: searchColumn as SessionHistoryColumn,
                value: `%${searchQuery.trim()}%`,
              });
            }

            downloadCSV(
              selectedCase === ALL_CASES_VALUE ? undefined : selectedCase,
              orderBy,
              filters,
            );
          }}
        >
          Export CSV
        </Button>
      </View>

      <View style={[styles.searchContainer, { marginBottom: 16 }]}>
        <Dropdown
          style={[
            styles.searchColumnDropdown,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          data={searchColumnOptions}
          labelField="label"
          valueField="value"
          value={searchColumn}
          placeholderStyle={[styles.timeRangePlaceholder, { color: palette.subtitle }]}
          selectedTextStyle={[styles.timeRangeSelectedText, { color: palette.text }]}
          iconStyle={[styles.timeRangeIcon, { tintColor: palette.subtitle }]}
          containerStyle={[
            styles.timeRangeMenu,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          itemTextStyle={{ color: palette.text }}
          activeColor={theme.dark ? theme.colors.elevation.level3 : theme.colors.elevation.level1}
          onChange={(item) => {
            setSearchColumn(item.value as ColumnId);
            setPage(0);
          }}
        />
        <Searchbar
          placeholder="Search..."
          onChangeText={(query) => {
            setSearchQuery(query);
            setPage(0);
          }}
          value={searchQuery}
          style={[
            styles.searchbar,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          inputStyle={{ color: palette.text, fontSize: 14 }}
          placeholderTextColor={palette.subtitle}
          iconColor={palette.subtitle}
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
          {/*
             CRITICAL FIX:
             We now use flexDirection: 'row' to line up COLUMNS side-by-side,
             instead of rows.
          */}
          <View style={[styles.tableWrapper, { minWidth: Dimensions.get('window').width - 40 }]}>
            {/* --- MAP COLUMNS FIRST --- */}
            {visibleColumns.map((colId) => {
              const colDef = PREDEFINED_COLUMNS.find((c) => c.id === colId)!;
              const isLastVisible = visibleColumns.length === 1;

              return (
                <View
                  key={colId}
                  style={[styles.columnWrapper, { borderRightColor: palette.border }]}
                >
                  {/* Header Cell for this specific column */}
                  <View
                    style={[
                      styles.headerCell,
                      { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                    ]}
                  >
                    <TouchableRipple
                      onPress={() => handleSort(colDef.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                        paddingVertical: 12,
                      }}
                    >
                      <>
                        <Text
                          style={[styles.headerLabel, { color: palette.subtitle }]}
                          numberOfLines={1}
                        >
                          {colDef.label}
                        </Text>
                        {sortColumn === colDef.id && (
                          <IconButton
                            icon={sortDirection === SortDirection.Asc ? 'arrow-up' : 'arrow-down'}
                            size={14}
                            style={{ margin: 0, width: 24, height: 24 }}
                            iconColor={palette.subtitle}
                          />
                        )}
                      </>
                    </TouchableRipple>
                    <Menu
                      visible={columnMenuState[colId] || false}
                      onDismiss={() => toggleColumnMenu(colId, false)}
                      anchor={
                        <IconButton
                          icon="chevron-down"
                          size={16}
                          onPress={() => toggleColumnMenu(colId, true)}
                          style={styles.menuIcon}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => removeColumn(colId)}
                        title="Remove"
                        disabled={isLastVisible}
                        leadingIcon="delete"
                      />
                    </Menu>
                  </View>

                  {/* Data Cells mapped downwards for this specific column */}
                  {sessionRecords.map((item, index) => (
                    <TouchableRipple
                      key={`${item.id || index}-${colId}`}
                      style={[styles.dataCell, { borderBottomColor: palette.border }]}
                      onPress={() => {
                        // Only open the dialog if there is actual text to show
                        if (item[colId]) {
                          setExpandedText({
                            title: colDef.label,
                            content: String(item[colId]),
                          });
                        }
                      }}
                    >
                      <Text numberOfLines={1} style={{ color: palette.text }}>
                        {item[colId] || '-'}
                      </Text>
                    </TouchableRipple>
                  ))}
                </View>
              );
            })}

            {/* --- THE ADD BUTTON COLUMN --- */}
            <View style={styles.addColumnWrapper}>
              {/* Header cell holding the Plus menu */}
              <View
                style={[
                  styles.headerCell,
                  styles.addHeaderCell,
                  { backgroundColor: palette.headerSurface, borderBottomColor: palette.border },
                ]}
              >
                <Menu
                  visible={addMenuVisible}
                  onDismiss={() => setAddMenuVisible(false)}
                  anchor={
                    <IconButton
                      icon="plus"
                      size={20}
                      mode="outlined"
                      onPress={() => setAddMenuVisible(true)}
                    />
                  }
                >
                  {hiddenColumns.length === 0 ? (
                    <Menu.Item title="No remaining columns" disabled />
                  ) : (
                    hiddenColumns.map((colDef) => (
                      <Menu.Item
                        key={colDef.id}
                        onPress={() => addColumn(colDef.id)}
                        title={colDef.label}
                        leadingIcon="table-column-plus-after"
                      />
                    ))
                  )}
                </Menu>
              </View>

              {/* Per-row action buttons to open EvaluationModal for each session */}
              {sessionRecords.map((item, index) => (
                <View
                  key={`action-${item.id || index}`}
                  style={[
                    styles.dataCell,
                    styles.actionCell,
                    { borderBottomColor: palette.border },
                  ]}
                >
                  <IconButton
                    icon="chart-box-outline"
                    size={18}
                    mode="contained-tonal"
                    onPress={() => openEvaluationForSession(item.id)}
                    disabled={!item.id}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Surface>

      {/* Pagination Controls */}
      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={page === 0}
          onPress={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <Text style={[styles.paginationText, { color: palette.text }]}>
          Page {page + 1} of {Math.max(1, Math.ceil(totalSessionRecords / itemsPerPage))}
        </Text>
        <Button
          mode="outlined"
          disabled={(page + 1) * itemsPerPage >= totalSessionRecords}
          onPress={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </View>

      {/* The Detail Dialog */}
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

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => {
            setSnackbarVisible(false);
            clearAnalyticsError();
          }}
          duration={Snackbar.DURATION_LONG}
          action={{
            label: 'Dismiss',
            onPress: () => {
              setSnackbarVisible(false);
              clearAnalyticsError();
            },
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>

      <EvaluationModal />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ==========================================
// 4. STYLES & APP EXPORT
// ==========================================

const styles = StyleSheet.create({
  // ... (Keep your existing screen, scrollContent, and gridContainer/card styles)
  screen: { flex: 1 },
  scrollContent: { padding: 16 },
  pageTitle: { fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 12 },

  timeRangeDropdown: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 52,
  },
  timeRangePlaceholder: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeRangeSelectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeIcon: {
    width: 18,
    height: 18,
  },
  timeRangeMenu: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchColumnDropdown: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 52,
  },
  searchbar: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },

  // --- NEW COLUMN-BASED TABLE STYLES ---
  tableSurface: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tableWrapper: {
    flexDirection: 'row', // Lines up the columns left-to-right
  },
  columnWrapper: {
    minWidth: 120, // The absolute smallest a column can be
    maxWidth: 400, // The maximum width before text gets truncated
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  addColumnWrapper: {
    width: 72, // Fixed width for the add/action column
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    height: 50, // FIXED HEIGHT IS MANDATORY
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addHeaderCell: {
    justifyContent: 'center',
    paddingLeft: 0,
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 56, // FIXED HEIGHT IS MANDATORY
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionCell: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  headerLabel: {
    fontWeight: 'bold',
    fontSize: 13,
    flexShrink: 1,
  },
  menuIcon: { margin: 0 },
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
  return <AnalyticsDashboard />;
}
