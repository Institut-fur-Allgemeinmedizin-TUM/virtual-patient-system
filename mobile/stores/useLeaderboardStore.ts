import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import { LeaderboardEntry } from '@/services/api';

export interface LeaderboardUser {
  username: string;
  score: number;
}

interface LeaderboardState {
  leaderboardData: LeaderboardEntry[];
  isLeaderboardLoading: boolean;
  leaderboardError: string | undefined;
  fetchLeaderboard: (caseId: string) => Promise<void>;
  clearLeaderboard: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  leaderboardData: [],
  isLeaderboardLoading: false,
  leaderboardError: undefined,

  fetchLeaderboard: async (caseId: string) => {
    set({ isLeaderboardLoading: true, leaderboardError: undefined });
    try {
      const resp = await apiClient.api.leaderboardApiStatsLeaderboardCaseIdGet(caseId);

      if (resp.status === 200 && resp.data) {
        const entries = resp.data.top_entries || [];

        set({
          leaderboardData: entries,
          isLeaderboardLoading: false,
        });
      } else {
        set({
          leaderboardError: 'Failed to load leaderboard data.',
          isLeaderboardLoading: false,
          leaderboardData: [],
        });
      }
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      set({
        leaderboardError: 'An error occurred while fetching the leaderboard.',
        isLeaderboardLoading: false,
        leaderboardData: [],
      });
    }
  },

  clearLeaderboard: () => set({ leaderboardData: [], leaderboardError: undefined }),
}));
