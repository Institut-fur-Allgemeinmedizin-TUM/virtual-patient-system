import { create } from 'zustand';
import { Case } from '@/lib/cases/case';
import { apiClient } from '@/lib/apiClient';
import { EvaluationResponse } from '@/services/api';

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
  startSession: (caseId: string, caseData: Case) => Promise<string | undefined>;
  loadSession: () => Promise<void>;
  chat: (msg: string) => void;
  evaluate: () => void;
  loadEvaluationMessages: (sessionId?: string, force?: boolean) => Promise<void>;
  resetEvaluation: () => void;
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

  startSession: async (caseId: string, caseData: Case) => {
    const resp = await apiClient.api.createSessionApiSessionsPost({ case_id: caseId });
    if (resp.data?.session_id) {
      set({ loaded: true, sessionId: resp.data.session_id, case: caseData, chatHistory: [] });
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
