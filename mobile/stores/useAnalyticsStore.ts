import { apiClient } from '@/lib/apiClient';
import {
  AggregationFunction,
  GetSessionsHistoryRequest,
  SessionHistoryColumn,
  SessionHistoryOrderBy,
} from '@/services/api';
import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type DashboardOverview = {
  avg_scores: Record<string, any> | null;
};

type SessionRecord = Record<string, any>;

type AnalyticsStore = {
  dashboardOverview: DashboardOverview | null;
  sessionRecords: SessionRecord[];
  totalSessionRecords: number;
  isLoadingSessions: boolean;
  isDownloadingCSV: boolean;

  loadDashboardOverview: (caseId?: string) => Promise<void>;
  loadSessionRecords: (
    limit?: number,
    offset?: number,
    orderBy?: SessionHistoryOrderBy[],
  ) => Promise<void>;
  downloadCSV: (caseId?: string, orderBy?: SessionHistoryOrderBy[]) => Promise<void>;
};

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  dashboardOverview: null,
  sessionRecords: [],
  totalSessionRecords: 0,
  isLoadingSessions: false,
  isDownloadingCSV: false,

  downloadCSV: async (caseId?: string, orderBy: SessionHistoryOrderBy[] = []) => {
    set({ isDownloadingCSV: true });
    try {
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
        ],
        aggregations: [],
        filters:
          caseId && caseId !== '__all__'
            ? [
                {
                  column: SessionHistoryColumn.Case,
                  value: caseId,
                },
              ]
            : [],
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
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvData, { encoding: 'utf8' });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Failed to download CSV:', error);
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

    apiClient.api.getSessionsStatsApiAnalyticsSessionsStatsPost(req).then((resp) => {
      const overview: DashboardOverview = {
        avg_scores: resp.data.rows[0].values,
      };
      set({ dashboardOverview: overview });
    });
  },

  loadSessionRecords: async (limit = 25, offset = 0, orderBy: SessionHistoryOrderBy[] = []) => {
    set({ isLoadingSessions: true });
    try {
      const req: GetSessionsHistoryRequest = {
        limit: limit,
        offset: offset,
        only_evaluated: true,
        group_by: [],
        order_by: orderBy,
        include_messages: false,

        include_columns: [
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
        ],
        aggregations: [],
      };

      const resp = await apiClient.api.getSessionsStatsApiAnalyticsSessionsStatsPost(req);
      const records = resp.data.rows.map((row) => row.values);
      set({
        sessionRecords: records,
        totalSessionRecords: resp.data.total,
        isLoadingSessions: false,
      });
    } catch (error) {
      console.error('Failed to load session records:', error);
      set({ isLoadingSessions: false });
    }
  },
}));
