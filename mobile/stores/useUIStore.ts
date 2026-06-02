import { create } from 'zustand';

interface UIState {
  scrollRequest: { section: string; timestamp: number } | null;
  requestScroll: (section: string) => void;

  // Modal states
  imprintModalOpen: boolean;
  privacyModalOpen: boolean;
  setImprintModalOpen: (open: boolean) => void;
  setPrivacyModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  scrollRequest: null,
  requestScroll: (section) => set({ scrollRequest: { section, timestamp: Date.now() } }),
  // Modal initial states
  imprintModalOpen: false,
  privacyModalOpen: false,
  setImprintModalOpen: (open) => set({ imprintModalOpen: open }),
  setPrivacyModalOpen: (open) => set({ privacyModalOpen: open }),
}));
