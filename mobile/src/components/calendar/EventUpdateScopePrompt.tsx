import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { spacing, typography } from '../../design/tokens';
import { CalendarUpdateScope } from '../../features/calendar/calendarTypes';
import { AppButton } from '../ui/AppButton';

type EventUpdateScopePromptProps = {
  supportedScopes: CalendarUpdateScope[];
  selectedScope: CalendarUpdateScope | null;
  onSelect: (scope: CalendarUpdateScope) => void;
};

export function EventUpdateScopePrompt({
  supportedScopes,
  selectedScope,
  onSelect,
}: EventUpdateScopePromptProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>Apply these changes to which events?</Text>
      <View style={styles.options}>
        {(
          [
            ['instance', 'This event only'],
            ['following', 'This and following'],
            ['series', 'All events'],
          ] as const
        ).map(([scope, label]) => {
          const supported = supportedScopes.includes(scope);
          return (
            <AppButton
              key={scope}
              label={supported ? label : `${label} (not supported here)`}
              accessibilityLabel={`Update ${label.toLowerCase()}${supported ? '' : ' (not supported here)'}`}
              accessibilityState={{ selected: selectedScope === scope }}
              variant={selectedScope === scope ? 'brandOutline' : 'secondary'}
              disabled={!supported}
              onPress={() => onSelect(scope)}
            />
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    prompt: {
      color: theme.colors.textPrimary,
      ...typography.body,
    },
    options: {
      gap: spacing.sm,
    },
  });
