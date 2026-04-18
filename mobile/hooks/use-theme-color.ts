/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useTheme } from 'react-native-paper';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const paperTheme = useTheme();
  const theme = paperTheme.dark ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  const paperColor = paperTheme.colors[colorName as keyof typeof paperTheme.colors];
  if (typeof paperColor === 'string') {
    return paperColor;
  }

  return Colors[theme][colorName];
}
