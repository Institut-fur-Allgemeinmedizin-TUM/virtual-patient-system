import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { Case } from '@/lib/cases/case';
import { apiClient } from '@/lib/apiClient';

type ChatRole = 'bot' | 'user';
type ChatMessage = {
  role: ChatRole;
  text: string;
};
interface SessionState {
  started: boolean;
  sessionId?: string;
  case?: Case;
  chatHistory?: ChatMessage[];
  waitingForBotresponse?: boolean;
  startSession: (caseId: string, caseData: Case) => Promise<string | undefined>;
  chat: (msg: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  started: false,
  sessionId: undefined,
  case: undefined,
  chatHistory: [],
  waitingForBotresponse: false,

  startSession: async (caseId: string, caseData: Case) => {
    const resp = await apiClient.api.createSessionApiSessionsPost({ case_id: caseId });
    if (resp.data?.session_id) {
      set({ started: true, sessionId: resp.data.session_id, case: caseData });
      return resp.data.session_id;
    } else {
      console.error('startSession failed: No session ID in response');
      return undefined;
    }
  },
  chat: (msg: string) => {
    if (!get().started || !get().sessionId) {
      console.error('Session not started or session ID missing');
      return;
    }
    set((state) => ({
      chatHistory: [...(state.chatHistory || []), { role: 'user', text: msg }],
      waitingForBotresponse: true,
    }));
    //Delay 10 sec
    setTimeout(() => {
      set((state) => ({
        chatHistory: [...(state.chatHistory || []), { role: 'bot', text: msg }],
        waitingForBotresponse: false,
      }));
    }, 10000);
  },
}));
