import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { Card } from '../ui/Card';
import { AppIconName } from '../../design/icons';

type CreateSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onCreateGoal: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
  onCreateEvent: () => void;
};

const createActions: readonly {
  label: string;
  icon: AppIconName;
  key: keyof Pick<
    CreateSheetProps,
    'onCreateGoal' | 'onCreateTask' | 'onCreateNote' | 'onCreateEvent'
  >;
}[] = [
  { label: 'Goal', icon: 'goal', key: 'onCreateGoal' },
  { label: 'Task', icon: 'task', key: 'onCreateTask' },
  { label: 'Note', icon: 'note', key: 'onCreateNote' },
  { label: 'Event', icon: 'calendar', key: 'onCreateEvent' },
];

export function CreateSheet(props: CreateSheetProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <BottomSheet visible={props.visible} onDismiss={props.onDismiss} accessibilityLabel="Create">
      <Text style={styles.title}>Create</Text>
      <View style={styles.actions}>
        {createActions.map((action) => (
          <Card
            key={action.key}
            accessibilityLabel={`Create ${action.label}`}
            onPress={props[action.key]}
            variant="outlined"
            style={styles.action}
          >
            <AppIcon name={action.icon} size={22} color={styles.icon.color} decorative />
            <Text style={styles.label}>{action.label}</Text>
          </Card>
        ))}
      </View>
    </BottomSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: { ...theme.typography.sectionTitle, color: theme.colors.text },
    actions: { gap: theme.spacing.sm },
    action: {
      minHeight: theme.layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    icon: { color: theme.colors.brand },
    label: { ...theme.typography.cardTitle, color: theme.colors.text },
  });
