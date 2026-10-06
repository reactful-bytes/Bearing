import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TaskFilter, TaskGroupBy } from '../../navigation/navigationTypes';
import { spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { AppModal } from '../ui/AppModal';
import { ModalHeaderAction } from '../ui/ModalHeaderAction';
import { SegmentedControl } from '../ui/SegmentedControl';

export type TaskDueDateFilter = 'any' | 'pastDue' | 'thisWeek' | 'thisMonth';

export type TaskFilterDraft = {
  taskFilter: TaskFilter;
  groupBy: TaskGroupBy;
  dueDateFilter: TaskDueDateFilter;
};

type TaskFilterModalProps = {
  visible: boolean;
  draft: TaskFilterDraft;
  onClose: () => void;
  onApply: (draft: TaskFilterDraft) => void;
};

const defaultFilters: TaskFilterDraft = {
  taskFilter: 'active',
  groupBy: 'unlinked',
  dueDateFilter: 'any',
};

export function TaskFilterModal({
  visible,
  draft: initialDraft,
  onClose,
  onApply,
}: TaskFilterModalProps) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    if (visible) setDraft(initialDraft);
  }, [initialDraft, visible]);

  return (
    <AppModal
      visible={visible}
      title="Filter tasks"
      onClose={onClose}
      dragToClose
      centeredHeader
      hideCloseButton
      headerAccessory={
        <ModalHeaderAction accessibilityLabel="Apply task filters" onPress={() => onApply(draft)} />
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status</Text>
          <SegmentedControl
            accessibilityLabel="Task status filter"
            options={[
              { value: 'active', label: 'Active', icon: 'active' },
              { value: 'completed', label: 'Completed', icon: 'completed' },
              { value: 'all', label: 'All', icon: 'tasks' },
            ]}
            value={draft.taskFilter}
            onChange={(taskFilter) => setDraft((current) => ({ ...current, taskFilter }))}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Group</Text>
          <SegmentedControl
            accessibilityLabel="Task grouping filter"
            options={[
              { value: 'goal', label: 'Goal', icon: 'goal' },
              { value: 'unlinked', label: 'Unlinked', icon: 'unlink' },
              { value: 'all', label: 'All', icon: 'tasks' },
            ]}
            value={draft.groupBy}
            onChange={(groupBy) => setDraft((current) => ({ ...current, groupBy }))}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Due date</Text>
          <View accessibilityLabel="Task due date filter" style={styles.dueDateGrid}>
            {(
              [
                { value: 'any', label: 'Any', icon: 'date' },
                { value: 'pastDue', label: 'Past due', icon: 'warning' },
                { value: 'thisWeek', label: 'This week', icon: 'dayView' },
                { value: 'thisMonth', label: 'This month', icon: 'monthView' },
              ] as const
            ).map((option) => {
              const selected = draft.dueDateFilter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      dueDateFilter: option.value as TaskDueDateFilter,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.dueDateOption,
                    selected ? styles.dueDateOptionSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <AppIcon
                    name={option.icon}
                    size={16}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.dueDateOptionText,
                      selected ? styles.dueDateOptionTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset task filters"
          onPress={() => setDraft(defaultFilters)}
          style={({ pressed }) => [styles.resetButton, pressed ? styles.pressed : null]}
        >
          <AppIcon name="refresh" size={16} color={styles.optionIcon.color} decorative />
          <Text style={styles.resetText}>Reset filters</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: spacing.lg, paddingBottom: spacing.sm },
    section: { gap: spacing.sm },
    sectionLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    dueDateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    dueDateOption: {
      minHeight: 44,
      flexGrow: 1,
      flexBasis: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.sm,
      paddingHorizontal: spacing.sm,
    },
    dueDateOptionSelected: {
      borderColor: theme.colors.brand,
      backgroundColor: theme.colors.surfaceBrand,
    },
    dueDateOptionText: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    dueDateOptionTextSelected: { color: theme.colors.brand },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    resetButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
    },
    resetText: { ...typography.helper, color: theme.colors.textPrimary, fontWeight: '600' },
    pressed: { opacity: 0.72 },
  });
