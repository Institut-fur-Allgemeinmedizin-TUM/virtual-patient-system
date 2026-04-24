import { Appearance } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  getResolvedTheme: () => ResolvedTheme;
  getMode(): ThemeMode;
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }

  return mode;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
  toggleMode: () =>
    set(({ mode }) => ({
      mode: mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light',
    })),
  getResolvedTheme: () => resolveTheme(get().mode),
  getMode: () => get().mode,
}));
