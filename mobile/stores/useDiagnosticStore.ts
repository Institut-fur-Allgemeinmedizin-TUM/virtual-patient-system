import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import { DiagnosticGroup } from '@/services/api';

interface DiagnosticState {
  availableDiagnostics: DiagnosticGroup[];
  usedDiagnostics: string[];
  diagnosticResults: Record<string, DiagnosticGroup>;
  loadingAvailable: boolean;
  loadingResults: Record<string, boolean>;
  error?: string;

  fetchAvailableDiagnostics: (caseId: string) => Promise<void>;
  fetchUsedDiagnostics: (sessionId: string, caseId: string) => Promise<void>;
  fetchDiagnosticResult: (
    caseId: string,
    diagnosticName: string,
    sessionId: string,
  ) => Promise<void>;
  reset: () => void;
}

export const useDiagnosticStore = create<DiagnosticState>((set, get) => ({
  availableDiagnostics: [],
  usedDiagnostics: [],
  diagnosticResults: {},
  loadingAvailable: false,
  loadingResults: {},
  error: undefined,

  fetchAvailableDiagnostics: async (caseId: string) => {
    set({ loadingAvailable: true, error: undefined });
    try {
      const resp =
        await apiClient.api.getMedicalBackgroundAvailableApiDiagnosticsCaseIdAvailableGet(caseId);
      if (resp.status === 200) {
        set({
          availableDiagnostics: resp.data.diagnostics_available,
          loadingAvailable: false,
        });
      } else {
        set({ error: 'Failed to fetch available diagnostics', loadingAvailable: false });
      }
    } catch (err) {
      set({ error: 'Error fetching available diagnostics', loadingAvailable: false });
      console.error(err);
    }
  },

  fetchUsedDiagnostics: async (sessionId: string, caseId: string) => {
    try {
      const resp = await apiClient.api.getUsedDiagnosticsApiSessionsSessionIdDiagnosticsGet(sessionId);
      if (resp.status === 200) {
        set({ usedDiagnostics: resp.data.diagnostics_used });
        resp.data.diagnostics_used.forEach((diagName) => {
          get().fetchDiagnosticResult(caseId, diagName, sessionId);
        });
      }
    } catch (err) {
      console.error('Error fetching used diagnostics', err);
    }
  },

  fetchDiagnosticResult: async (caseId: string, diagnosticName: string, sessionId: string) => {
    set((state) => ({
      loadingResults: { ...state.loadingResults, [diagnosticName]: true },
      error: undefined,
    }));
    try {
      const resp = await apiClient.api.getMedicalBackgroundApiDiagnosticsCaseIdGet(caseId, {
        diagnostic: diagnosticName,
        session_id: sessionId,
      });
      if (resp.status === 200) {
        set((state) => ({
          diagnosticResults: { ...state.diagnosticResults, [diagnosticName]: resp.data },
          loadingResults: { ...state.loadingResults, [diagnosticName]: false },
        }));
      } else {
        set((state) => ({
          error: `Failed to fetch diagnostic result for ${diagnosticName}`,
          loadingResults: { ...state.loadingResults, [diagnosticName]: false },
        }));
      }
    } catch (err) {
      set((state) => ({
        error: `Error fetching diagnostic result for ${diagnosticName}`,
        loadingResults: { ...state.loadingResults, [diagnosticName]: false },
      }));
      console.error(err);
    }
  },

  reset: () => {
    set({
      availableDiagnostics: [],
      usedDiagnostics: [],
      diagnosticResults: {},
      loadingAvailable: false,
      loadingResults: {},
      error: undefined,
    });
  },
}));
