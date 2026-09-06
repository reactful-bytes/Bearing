# Design Tokens

Shared visual tokens for the mobile app live in `tokens.ts`. Runtime theme
selection is provided by `ThemeProvider.tsx` and persisted through
AsyncStorage.

The module is split into small buckets so feature screens can reuse the same language without introducing a heavyweight theme system:

- `darkTheme` and `lightTheme` for semantic colors, type, spacing, radius,
  layout, and component roles
- `useTheme` for the active theme, preference, hydration status, and persisted
  preference setter
- `useThemedStyles` for memoized `StyleSheet` creation from active tokens
- `colors` and `componentTokens` as temporary dark-default compatibility aliases
- `icons.ts` and `AppIcon` for the semantic icon registry and accessible icon
  rendering

New components must use `useTheme` or `useThemedStyles`; do not add raw color
values or direct vector-icon names outside the registry.
