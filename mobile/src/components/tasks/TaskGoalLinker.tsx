import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { GoalWithTasks } from '../../features/goals/goalTypes';
import { AppModal } from '../ui/AppModal';
import { ListItem } from '../ui/ListItem';

type TaskGoalLinkerProps = {
  goals: GoalWithTasks[];
  value: string | null;
  onChange: (goalId: string | null) => void;
  disabled?: boolean;
};

export function TaskGoalLinker({ goals, value, onChange, disabled = false }: TaskGoalLinkerProps) {
  const styles = useThemedStyles(createStyles);
  const [pickerVisible, setPickerVisible] = useState(false);
  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === value) ?? null, [goals, value]);

  function selectGoal(goalId: string | null): void {
    onChange(goalId);
    setPickerVisible(false);
  }

  return (
    <>
      <ListItem
        title="Goal"
        description="Link this task to a goal or leave it unlinked."
        trailingText={selectedGoal?.title ?? 'No goal'}
        accessibilityLabel="Choose task goal"
        onPress={() => setPickerVisible(true)}
        disabled={disabled}
      />

      <AppModal
        visible={pickerVisible}
        title="Link Task to a Goal"
        onClose={() => setPickerVisible(false)}
        closeLabel="Done"
      >
        <ScrollView contentContainerStyle={styles.options}>
          <Text style={styles.helperText}>Choose the goal this task supports.</Text>
          <ListItem
            title="No goal"
            description="Keep this task independent."
            accessibilityLabel="Leave task unlinked"
            onPress={() => selectGoal(null)}
            variant="row"
            showDivider={goals.length > 0}
            colorTone={value === null ? 'purple' : 'default'}
          />
          {goals.map((goal, index) => (
            <ListItem
              key={goal.id}
              title={goal.title}
              description={goal.status === 'archived' ? 'Archived goal' : goal.status}
              accessibilityLabel={`Link task to ${goal.title}`}
              onPress={() => selectGoal(goal.id)}
              trailingText={value === goal.id ? 'Selected' : undefined}
              variant="row"
              showDivider={index < goals.length - 1}
              colorTone={value === goal.id ? 'purple' : 'default'}
            />
          ))}
        </ScrollView>
      </AppModal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    options: {
      paddingBottom: spacing.sm,
    },
    helperText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
  });