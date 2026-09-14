export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
};

export const typography = {
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
  },
  screenTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tabIcon: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
};

export const layout = {
  pagePaddingHorizontal: spacing.lg,
  pagePaddingVertical: spacing.xl,
  tabBarHeight: 72,
  tabBarPaddingVertical: spacing.md,
  tabIconSize: 28,
  tabIconRadius: 14,
  minimumTouchTarget: 44,
};

type ThemeColors = {
  background: string;
  backgroundRaised: string;
  surface: string;
  surfaceMuted: string;
  surfaceBrand: string;
  surfacePurple: string;
  surfaceRaised: string;
  surfacePressed: string;
  elevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brand: string;
  success: string;
  focusGreen: string;
  warning: string;
  purple: string;
  danger: string;
  dangerSurface: string;
  dangerText: string;
  importedCyan: string;
  scrim: string;
  onBrand: string;
};

const darkColors: ThemeColors = {
  background: '#061220',
  backgroundRaised: '#0B162E',
  surface: '#111F35',
  surfaceMuted: '#1E293B',
  surfaceBrand: '#172B4D',
  surfacePurple: '#241B3B',
  surfaceRaised: '#16233D',
  surfacePressed: '#0C1B30',
  elevated: '#1E293B',
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: '#334155',
  text: '#E2E8F0',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  brand: '#2F7FE8',
  success: '#43B977',
  focusGreen: '#6DBA72',
  warning: '#F5B83D',
  purple: '#9B6BE8',
  danger: '#E45A5A',
  dangerSurface: '#3F1D2A',
  dangerText: '#FCA5A5',
  importedCyan: '#29D1E3',
  scrim: 'rgba(11, 31, 42, 0.42)',
  onBrand: '#FFFFFF',
};

const lightColors: ThemeColors = {
  background: '#F4F8FA',
  backgroundRaised: '#EAF1F4',
  surface: '#FCFEFF',
  surfaceMuted: '#E4EEF3',
  surfaceBrand: '#D7E6ED',
  surfacePurple: '#F1E8FC',
  surfaceRaised: '#FFFFFF',
  surfacePressed: '#DCE8ED',
  elevated: '#FFFFFF',
  border: '#D3E1E8',
  borderStrong: '#B7CBD4',
  text: '#0B1F2A',
  textPrimary: '#153748',
  textSecondary: '#496879',
  textMuted: '#6B7D88',
  brand: '#0E5E85',
  success: '#16803A',
  focusGreen: '#227A46',
  warning: '#A86500',
  purple: '#7E22CE',
  danger: '#B42318',
  dangerSurface: '#FDEAEA',
  dangerText: '#8A1E1E',
  importedCyan: '#0E7C8C',
  scrim: 'rgba(11, 31, 42, 0.42)',
  onBrand: '#FFFFFF',
};

function createComponentTokens(colors: ThemeColors) {
  return {
    button: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.brand,
      textColor: colors.onBrand,
    },
    card: {
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.md,
    },
    tabBar: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    tabIcon: {
      backgroundColor: colors.surfaceBrand,
      focusedBackgroundColor: colors.brand,
      textColor: colors.textSecondary,
      focusedTextColor: colors.onBrand,
    },
  } as const;
}

export type Theme = {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  componentTokens: ReturnType<typeof createComponentTokens>;
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  radii,
  layout,
  componentTokens: createComponentTokens(darkColors),
};

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  radii,
  layout,
  componentTokens: createComponentTokens(lightColors),
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const;

// Compatibility aliases keep existing screens stable while they migrate to useTheme.
export const colors = darkTheme.colors;
export const componentTokens = darkTheme.componentTokens;
