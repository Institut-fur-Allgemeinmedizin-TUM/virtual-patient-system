import { create } from 'zustand';
import { Case } from '@/lib/cases/case';
import { apiClient } from '@/lib/apiClient';
import {
  EvaluationResponse,
  UserSessionFeedBack,
  FeedBackMarkerType,
  ContentType,
} from '@/services/api';
import { useDiagnosticStore } from './useDiagnosticStore';

type ChatRole = 'bot' | 'user';
type ChatMessage = {
  role: ChatRole;
  text: string;
};
interface SessionState {
  loaded: boolean;
  sessionId?: string;
  case?: Case;
  chatHistory?: ChatMessage[];
  waitingForBotresponse?: boolean;
  evaluationResponse: EvaluationResponse | undefined;
  waitingForEvaluationResponse: boolean;
  evaluationMessages: ChatMessage[];
  waitingForEvaluationMessages: boolean;
  evaluationMessagesError?: string;
  waitingForFeedbackSubmission: boolean;
  waitingForFeedbackFetch: boolean;
  allFeedbacks: UserSessionFeedBack[];
  totalFeedbacks: number;
  waitingForAllFeedbacks: boolean;
  markFeedbackError?: string;
  fetchAllFeedbacks: (
    limit?: number,
    offset?: number,
    marker?: FeedBackMarkerType,
  ) => Promise<UserSessionFeedBack[]>;
  fetchFeedback: () => Promise<{ score: number; comment: string } | undefined>;
  submitFeedback: (score: number, comment: string) => Promise<boolean>;
  startSession: (caseId: string, caseData: Case) => Promise<string | undefined>;
  loadSession: () => Promise<void>;
  chat: (msg: string) => void;
  evaluate: () => void;
  loadEvaluationMessages: (sessionId?: string, force?: boolean) => Promise<void>;
  resetEvaluation: () => void;
  markFeedback: (sessionId: string, marker: FeedBackMarkerType) => Promise<boolean>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  loaded: false,
  sessionId: undefined,
  case: undefined,
  chatHistory: [],
  waitingForBotresponse: false,
  evaluationResponse: undefined,
  waitingForEvaluationResponse: false,
  evaluationMessages: [],
  waitingForEvaluationMessages: false,
  evaluationMessagesError: undefined,
  waitingForFeedbackSubmission: false,
  waitingForFeedbackFetch: false,
  allFeedbacks: [],
  totalFeedbacks: 0,
  waitingForAllFeedbacks: false,
  markFeedbackError: undefined,

  fetchAllFeedbacks: async (limit = 100, offset = 0, marker?: FeedBackMarkerType) => {
    set({ waitingForAllFeedbacks: true });
    try {
      const queryParams: any = { limit, offset };
      if (marker) queryParams.marker = marker;
      const resp = await apiClient.api.getAllFeedbacksApiAdminFeedbacksGet(queryParams);
      set({
        waitingForAllFeedbacks: false,
        allFeedbacks: resp.data.feedbacks,
        totalFeedbacks: resp.data.total,
      });
      return resp.data.feedbacks;
    } catch (error) {
      console.error('Failed to fetch all feedbacks:', error);
      set({ waitingForAllFeedbacks: false });
      return [];
    }
  },

  fetchFeedback: async () => {
    const sessionId = get().sessionId || get().evaluationResponse?.session_id;
    if (!sessionId) {
      console.error('No session ID to fetch feedback');
      return undefined;
    }
    set({ waitingForFeedbackFetch: true });
    try {
      const resp = await apiClient.api.getFeedbackApiSessionsSessionIdFeedbackGet(sessionId);
      set({ waitingForFeedbackFetch: false });
      if (resp.status === 200) {
        return {
          score: resp.data.feedback_score,
          comment: resp.data.feedback_comment,
        };
      }
    } catch (error: any) {
      set({ waitingForFeedbackFetch: false });

      if (error.response?.status !== 404) {
        console.error('Failed to fetch feedback:', error);
      }
      return { score: 0, comment: '' };
    }
    return undefined;
  },

  submitFeedback: async (score: number, comment: string) => {
    const sessionId = get().sessionId || get().evaluationResponse?.session_id;
    if (!sessionId) {
      console.error('No session ID for feedback');
      return false;
    }
    set({ waitingForFeedbackSubmission: true });
    try {
      const resp = await apiClient.api.createFeedbackApiSessionsSessionIdFeedbackPost(sessionId, {
        session_id: sessionId,
        feedback_score: score,
        feedback_comment: comment,
      });
      set({ waitingForFeedbackSubmission: false });
      return resp.status === 200;
    } catch (error) {
      console.error('Feedback submission error:', error);
      set({ waitingForFeedbackSubmission: false });
      return false;
    }
  },

  markFeedback: async (sessionId: string, marker: FeedBackMarkerType) => {
    set({ markFeedbackError: undefined });
    try {
      const resp = await apiClient.request({
        path: `/api/admin/feedbacks/${sessionId}/mark`,
        method: 'PATCH',
        body: { marker },
        secure: true,
        type: ContentType.Json,
      });
      if (resp.status === 200) {
        set((state) => ({
          allFeedbacks: state.allFeedbacks.map((f) =>
            f.session_id === sessionId ? { ...f, marker } : f,
          ),
        }));
        return true;
      }
      console.error('Failed to update feedback marker:');
      set({ markFeedbackError: 'Failed to update feedback marker' });
      return false;
    } catch (error: any) {
      console.error('Failed to update feedback marker:', error);
      set({ markFeedbackError: error?.message || 'Failed to update feedback marker' });
      return false;
    }
  },

  startSession: async (caseId: string, caseData: Case) => {
    const resp = await apiClient.api.createSessionApiSessionsPost({ case_id: caseId });
    if (resp.data?.session_id) {
      set({ loaded: true, sessionId: resp.data.session_id, case: caseData, chatHistory: [] });
      useDiagnosticStore.getState().reset();
      return resp.data.session_id;
    } else {
      console.error('startSession failed: No session ID in response');
      return undefined;
    }
  },
  loadSession: async () => {
    apiClient.api
      .getSessionMessagesApiSessionsSessionIdMessagesGet(get().sessionId!)
      .then((resp) => {
        const messages = resp.data
          .messages!.filter((msg) => msg.role !== 'system')
          .map((msg) => ({
            role: (msg.role === 'user' ? 'user' : 'bot') as ChatRole,
            text: msg.content,
          }));
        let caseModel;
        apiClient.api.getCaseDetailsApiCasesCaseIdGet(resp.data.case_id).then((caseResp) => {
          const c = caseResp.data;
          caseModel = new Case({
            id: c.id,
            patientName: c.patient_name,
            title: c.title,
            patientAge: c.patient_age,
            patientOccupation: c.patient_occupation,
          });
          set({ chatHistory: messages, case: caseModel, loaded: true });
        });
      });
  },
  chat: (msg: string) => {
    if (!get().loaded || !get().sessionId) {
      console.error('Session not started or session ID missing');
      return;
    }
    set((state) => ({
      chatHistory: [...(state.chatHistory || []), { role: 'user', text: msg }],
      waitingForBotresponse: true,
    }));
    apiClient.api
      .chatApiChatPost({
        session_id: get().sessionId!,
        message: msg,
      })
      .then((resp) => {
        if (resp.status !== 200) {
          set((state) => ({
            chatHistory: [...(state.chatHistory || []), { role: 'bot', text: 'error' }],
            waitingForBotresponse: false,
          }));
        } else {
          set((state) => ({
            chatHistory: [...(state.chatHistory || []), { role: 'bot', text: resp.data.reply }],
            waitingForBotresponse: false,
          }));
        }
      })
      .catch((error) => {
        set((state) => ({
          chatHistory: [...(state.chatHistory || []), { role: 'bot', text: 'error' }],
          waitingForBotresponse: false,
        }));
      });
  },
  evaluate: () => {
    set((state) => ({
      waitingForEvaluationResponse: true,
      evaluationMessagesError: undefined,
    }));
    apiClient.api
      .evaluateSessionApiSessionsSessionIdEvaluatePost(get().sessionId!)
      .then((resp) => {
        if (resp.status !== 200) {
          console.error('Evaluation failed');
          set((state) => ({
            waitingForEvaluationResponse: false,
          }));
        } else {
          set((state) => ({
            waitingForEvaluationResponse: false,
            evaluationResponse: resp.data,
          }));
        }
      })
      .catch((error) => {
        console.error('Evaluation error:', error);
        set((state) => ({
          waitingForEvaluationResponse: false,
        }));
      });
  },
  loadEvaluationMessages: async (sessionId?: string, force = false) => {
    const resolvedSessionId = sessionId || get().evaluationResponse?.session_id || get().sessionId;

    if (!resolvedSessionId) {
      set({
        evaluationMessagesError: 'Keine Session-ID für Gesprächsverlauf verfügbar.',
      });
      return;
    }

    const existingMessages = get().evaluationMessages;
    if (existingMessages.length > 0 && !force) {
      return;
    }

    set({ waitingForEvaluationMessages: true, evaluationMessagesError: undefined });

    try {
      const resp =
        await apiClient.api.getSessionMessagesApiSessionsSessionIdMessagesGet(resolvedSessionId);
      const messages = (resp.data.messages || [])
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: (msg.role === 'user' ? 'user' : 'bot') as ChatRole,
          text: msg.content,
        }));

      set({
        evaluationMessages: messages,
        waitingForEvaluationMessages: false,
        evaluationMessagesError: undefined,
      });
    } catch (error) {
      console.error('Failed to load evaluation messages:', error);
      set({
        waitingForEvaluationMessages: false,
        evaluationMessagesError: 'Gesprächsverlauf konnte nicht geladen werden.',
      });
    }
  },
  resetEvaluation: () => {
    set({
      evaluationResponse: undefined,
      waitingForEvaluationResponse: false,
      evaluationMessages: [],
      waitingForEvaluationMessages: false,
      evaluationMessagesError: undefined,
    });
  },
}));
