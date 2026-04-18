import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
} from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { Platform } from 'react-native';

const lightPalette = {
  primary: '#0B5FA5',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D7EAFE',
  onPrimaryContainer: '#001D36',
  secondary: '#006B5B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#C5F5EA',
  onSecondaryContainer: '#00201B',
  tertiary: '#5B5F96',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#E2E0FF',
  onTertiaryContainer: '#171B46',
  background: '#F4F7FB',
  onBackground: '#102033',
  surface: '#FFFFFF',
  onSurface: '#102033',
  surfaceVariant: '#E4EBF4',
  onSurfaceVariant: '#425466',
  outline: '#B8C3D0',
  outlineVariant: '#D5DFEA',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',
};

const darkPalette = {
  primary: '#8BC4FF',
  onPrimary: '#003258',
  primaryContainer: '#00497D',
  onPrimaryContainer: '#D7EAFE',
  secondary: '#7CD7C2',
  onSecondary: '#00382F',
  secondaryContainer: '#005145',
  onSecondaryContainer: '#A4F2DE',
  tertiary: '#BEC2FF',
  onTertiary: '#272B60',
  tertiaryContainer: '#3D4279',
  onTertiaryContainer: '#E2E0FF',
  background: '#111418',
  onBackground: '#E5EAF0',
  surface: '#171B20',
  onSurface: '#E5EAF0',
  surfaceVariant: '#2A313A',
  onSurfaceVariant: '#C1CBD6',
  outline: '#6E7B89',
  outlineVariant: '#394451',
  error: '#F2B8B5',
  onError: '#601410',
  errorContainer: '#8C1D18',
  onErrorContainer: '#F9DEDC',
};

function createPaperTheme(baseTheme: typeof MD3LightTheme, palette: typeof lightPalette) {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...palette,
    },
  };
}

export const paperLightTheme = createPaperTheme(MD3LightTheme, lightPalette);
export const paperDarkTheme = createPaperTheme(MD3DarkTheme, darkPalette);

export const navigationLightTheme = {
  ...NavigationLightTheme,
  colors: {
    ...NavigationLightTheme.colors,
    primary: lightPalette.primary,
    background: lightPalette.background,
    card: lightPalette.surface,
    text: lightPalette.onSurface,
    border: lightPalette.outlineVariant,
    notification: lightPalette.error,
  },
};

export const navigationDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkPalette.primary,
    background: darkPalette.background,
    card: darkPalette.surface,
    text: darkPalette.onSurface,
    border: darkPalette.outlineVariant,
    notification: darkPalette.error,
  },
};

export const Colors = {
  light: {
    text: lightPalette.onBackground,
    background: lightPalette.background,
    tint: lightPalette.primary,
    icon: lightPalette.onSurfaceVariant,
    tabIconDefault: lightPalette.onSurfaceVariant,
    tabIconSelected: lightPalette.primary,
    primary: lightPalette.primary,
    surface: lightPalette.surface,
    surfaceVariant: lightPalette.surfaceVariant,
    outline: lightPalette.outline,
    error: lightPalette.error,
  },
  dark: {
    text: darkPalette.onBackground,
    background: darkPalette.background,
    tint: darkPalette.primary,
    icon: darkPalette.onSurfaceVariant,
    tabIconDefault: darkPalette.onSurfaceVariant,
    tabIconSelected: darkPalette.primary,
    primary: darkPalette.primary,
    surface: darkPalette.surface,
    surfaceVariant: darkPalette.surfaceVariant,
    outline: darkPalette.outline,
    error: darkPalette.error,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
