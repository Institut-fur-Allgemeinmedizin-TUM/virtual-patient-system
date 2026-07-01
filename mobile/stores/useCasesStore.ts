import { create } from 'zustand';
import { Case } from '@/lib/cases/case';
import { apiClient } from '@/lib/apiClient';
import { SessionsSummaryResponse } from '@/services/api';

interface CasesState {
  loaded: boolean;
  summaryLoaded: boolean;
  summaryLoading: boolean;
  cases: Case[];
  sessionScores: Record<
    string,
    { sessionId: string; score: number; rank: number; topPercentage: number }
  >;
  error: boolean;
  summaryError: boolean;

  loadAndGetCases: () => Promise<Case[]>;
  loadSessionSummaries: () => Promise<void>;
}

export const useCasesStore = create<CasesState>((set, get) => ({
  loaded: false,
  summaryLoaded: false,
  summaryLoading: false,
  cases: [],
  sessionScores: {},
  error: false,
  summaryError: false,

  loadAndGetCases: async () => {
    if (get().loaded) {
      return get().cases;
    }
    try {
      const cases = await apiClient.api.getCasesApiCasesGet();
      const mappedCases = cases.data.cases.map((c) => {
        const caseModel = new Case({
          id: c.id,
          patientName: c.patient_name,
          title: c.title,
          patientAge: c.patient_age,
          patientOccupation: c.patient_occupation,
        });
        caseModel.id = c.id;
        caseModel.patientName = c.patient_name;

        return caseModel;
      });

      set({ cases: mappedCases, loaded: true, error: false });
      return mappedCases;
    } catch (error) {
      console.error('Failed to load cases:', error);
      set({ error: true, loaded: false });
      return [];
    }
  },

  loadSessionSummaries: async () => {
    const { summaryLoaded, summaryLoading } = get();
    if (summaryLoaded || summaryLoading) {
      return;
    }

    set({ summaryLoading: true, summaryError: false });

    try {
      const data = (await apiClient.api.getLastSessionSummaryApiSessionsSummaryGet())
        .data as SessionsSummaryResponse | null;
      if (data === null) {
        throw new Error('Response is null');
      }
      let sessionScores: Record<
        string,
        { sessionId: string; score: number; rank: number; topPercentage: number }
      > = {};
      for (const [caseId, sD] of Object.entries(data.sessions)) {
        sessionScores[caseId] = {
          sessionId: sD.sessionId,
          score: sD.score,
          rank: sD.rank,
          topPercentage: sD.topPercentage,
        };
      }
      set({
        sessionScores: sessionScores,
        summaryLoaded: true,
        summaryLoading: false,
        summaryError: false,
      });
    } catch (error) {
      console.error('Failed to load session summaries:', error);
      set({ summaryLoaded: true, summaryLoading: false, summaryError: true });
    }
  },
}));
