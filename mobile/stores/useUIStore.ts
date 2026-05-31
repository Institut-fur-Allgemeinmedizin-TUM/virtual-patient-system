import { create } from 'zustand';

interface UIState {
  scrollRequest: { section: string; timestamp: number } | null;
  requestScroll: (section: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  scrollRequest: null,
  requestScroll: (section) => set({ scrollRequest: { section, timestamp: Date.now() } }),
}));
