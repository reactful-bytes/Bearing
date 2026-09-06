import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Theme } from './tokens';
import { useTheme } from './ThemeProvider';

export function useThemedStyles<Styles extends StyleSheet.NamedStyles<Styles>>(
  createStyles: (theme: Theme) => Styles,
): Styles {
  const { theme } = useTheme();

  return useMemo(() => StyleSheet.create(createStyles(theme)), [createStyles, theme]);
}
