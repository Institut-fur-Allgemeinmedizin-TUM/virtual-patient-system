import { apiClient } from '@/lib/apiClient';
import {
  AggregationFunction,
  GetSessionsHistoryRequest,
  SessionHistoryColumn,
  SessionHistoryFilter,
  SessionHistoryOrderBy,
} from '@/services/api';
import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

type DashboardOverview = {
  avg_scores: Record<string, any> | null;
};

type SessionRecord = Record<string, any>;

type AnalyticsError = {
  message: string;
  action: 'downloadCSV' | 'loadDashboardOverview' | 'loadSessionRecords';
  timestamp: number;
};

type AnalyticsStore = {
  dashboardOverview: DashboardOverview | null;
  sessionRecords: SessionRecord[];
  totalSessionRecords: number;
  isLoadingSessions: boolean;
  isDownloadingCSV: boolean;
  analyticsError: AnalyticsError | null;

  loadDashboardOverview: (caseId?: string) => Promise<void>;
  loadSessionRecords: (
    limit?: number,
    offset?: number,
    orderBy?: SessionHistoryOrderBy[],
    filters?: SessionHistoryFilter[],
  ) => Promise<void>;
  downloadCSV: (
    caseId?: string,
    orderBy?: SessionHistoryOrderBy[],
    filters?: SessionHistoryFilter[],
  ) => Promise<void>;
  clearAnalyticsError: () => void;
};

const getAnalyticsErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  dashboardOverview: null,
  sessionRecords: [],
  totalSessionRecords: 0,
  isLoadingSessions: false,
  isDownloadingCSV: false,
  analyticsError: null,

  clearAnalyticsError: () => set({ analyticsError: null }),

  downloadCSV: async (
    caseId?: string,
    orderBy: SessionHistoryOrderBy[] = [],
    filters: SessionHistoryFilter[] = [],
  ) => {
    set({ isDownloadingCSV: true });
    try {
      const effectiveFilters = [...filters];
      if (
        caseId &&
        caseId !== '__all__' &&
        !effectiveFilters.some((f) => f.column === SessionHistoryColumn.Case)
      ) {
        effectiveFilters.push({
          column: SessionHistoryColumn.Case,
          value: caseId,
        });
      }

      const req: GetSessionsHistoryRequest = {
        limit: 0,
        offset: 0,
        only_evaluated: true,
        group_by: [],
        order_by: orderBy,
        include_messages: true,
        include_columns: [
          SessionHistoryColumn.Id,
          SessionHistoryColumn.Case,
          SessionHistoryColumn.EndedAt,
          SessionHistoryColumn.StartedAt,
          SessionHistoryColumn.Criterion1Score,
          SessionHistoryColumn.Criterion1Explanation,
          SessionHistoryColumn.Criterion2Score,
          SessionHistoryColumn.Criterion2Explanation,
          SessionHistoryColumn.Criterion3Score,
          SessionHistoryColumn.Criterion3Explanation,
          SessionHistoryColumn.Criterion4Score,
          SessionHistoryColumn.Criterion4Explanation,
          SessionHistoryColumn.Criterion5Score,
          SessionHistoryColumn.Criterion5Explanation,
          SessionHistoryColumn.Criterion6Score,
          SessionHistoryColumn.Criterion6Explanation,
          SessionHistoryColumn.Criterion7Score,
          SessionHistoryColumn.Criterion7Explanation,
          SessionHistoryColumn.Criterion8Score,
          SessionHistoryColumn.Criterion8Explanation,
          SessionHistoryColumn.LiveTimeUsed,
          SessionHistoryColumn.UserWordCount,
          SessionHistoryColumn.DurationMinutes,
        ],
        aggregations: [],
        filters: effectiveFilters,
      };

      const resp = await apiClient.api.getSessionsStatsApiAnalyticsSessionsStatsPost(
        req,
        { as_csv: true },
        { format: 'text' } as any,
      );

      const csvData = resp.data as unknown as string;
      const filename = `sessions_stats_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.Paths.join(FileSystem.Paths.document, filename);
        await FileSystem.writeAsStringAsync(fileUri, csvData, { encoding: 'utf8' });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
        }
      }
      set({ analyticsError: null });
    } catch (error) {
      console.error('Failed to download CSV:', error);
      set({
        analyticsError: {
          message: getAnalyticsErrorMessage(error, 'Failed to download CSV. Please try again.'),
          action: 'downloadCSV',
          timestamp: Date.now(),
        },
      });
    } finally {
      set({ isDownloadingCSV: false });
    }
  },

  loadDashboardOverview: async (caseId?: string) => {
    //Build request
    const req: GetSessionsHistoryRequest = {
      limit: 0,
      offset: 0,
      only_evaluated: true,
      group_by: [],
      order_by: [],
      include_messages: false,
      include_columns: [],
      aggregations: [
        {
          column: SessionHistoryColumn.Criterion1Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion2Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion3Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion4Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion5Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion6Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion7Score,
          function: AggregationFunction.Avg,
        },
        {
          column: SessionHistoryColumn.Criterion8Score,
          function: AggregationFunction.Avg,
        },
      ],
      filters: caseId
        ? [
            {
              column: SessionHistoryColumn.Case,
              value: caseId,
            },
          ]
        : [],
    };

    try {
      const resp = await apiClient.api.getSessionsStatsApiAnalyticsSessionsStatsPost(req);
      const overview: DashboardOverview = {
        avg_scores: resp.data.rows[0].values,
      };
      set({ dashboardOverview: overview, analyticsError: null });
    } catch (error) {
      console.error('Failed to load analytics overview:', error);
      set({
        analyticsError: {
          message: getAnalyticsErrorMessage(
            error,
            'Failed to load analytics overview. Please try again.',
          ),
          action: 'loadDashboardOverview',
          timestamp: Date.now(),
        },
      });
    }
  },

  loadSessionRecords: async (
    limit = 25,
    offset = 0,
    orderBy: SessionHistoryOrderBy[] = [],
    filters: SessionHistoryFilter[] = [],
  ) => {
    set({ isLoadingSessions: true });
    try {
      const req: GetSessionsHistoryRequest = {
        limit: limit,
        offset: offset,
        only_evaluated: true,
        group_by: [],
        order_by: orderBy,
        include_messages: false,
        filters: filters,
        include_columns: [
          SessionHistoryColumn.StartedAt,
          SessionHistoryColumn.Id,
          SessionHistoryColumn.Case,
          SessionHistoryColumn.EndedAt,
          SessionHistoryColumn.Criterion1Score,
          SessionHistoryColumn.Criterion1Explanation,
          SessionHistoryColumn.Criterion2Score,
          SessionHistoryColumn.Criterion2Explanation,
          SessionHistoryColumn.Criterion3Score,
          SessionHistoryColumn.Criterion3Explanation,
          SessionHistoryColumn.Criterion4Score,
          SessionHistoryColumn.Criterion4Explanation,
          SessionHistoryColumn.Criterion5Score,
          SessionHistoryColumn.Criterion5Explanation,
          SessionHistoryColumn.Criterion6Score,
          SessionHistoryColumn.Criterion6Explanation,
          SessionHistoryColumn.Criterion7Score,
          SessionHistoryColumn.Criterion7Explanation,
          SessionHistoryColumn.Criterion8Score,
          SessionHistoryColumn.Criterion8Explanation,
          SessionHistoryColumn.LiveTimeUsed,
          SessionHistoryColumn.UserWordCount,
          SessionHistoryColumn.DurationMinutes,
        ],
        aggregations: [],
      };

      const resp = await apiClient.api.getSessionsStatsApiAnalyticsSessionsStatsPost(req);
      const records = resp.data.rows.map((row) => row.values);
      set({
        sessionRecords: records,
        totalSessionRecords: resp.data.total,
        isLoadingSessions: false,
        analyticsError: null,
      });
    } catch (error) {
      console.error('Failed to load session records:', error);
      set({
        analyticsError: {
          message: getAnalyticsErrorMessage(
            error,
            'Failed to load session records. Please try again.',
          ),
          action: 'loadSessionRecords',
          timestamp: Date.now(),
        },
      });
      set({ isLoadingSessions: false });
    }
  },
}));
