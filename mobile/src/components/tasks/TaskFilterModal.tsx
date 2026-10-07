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

const DUE_DATE_OPTIONS = [
  { value: 'any', label: 'Any', icon: 'date' },
  { value: 'pastDue', label: 'Past due', icon: 'warning' },
  { value: 'thisWeek', label: 'This week', icon: 'dayView' },
  { value: 'thisMonth', label: 'This month', icon: 'monthView' },
] as const;

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
              { value: 'unlinked', label: 'Unlinked', icon: 'unlink' },
              { value: 'goal', label: 'Goal', icon: 'goal' },
              { value: 'all', label: 'All', icon: 'tasks' },
            ]}
            value={draft.groupBy}
            onChange={(groupBy) => setDraft((current) => ({ ...current, groupBy }))}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Due date</Text>
          <View accessibilityLabel="Task due date filter" style={styles.dateOptions}>
            {DUE_DATE_OPTIONS.map((option) => {
              const selected = draft.dueDateFilter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setDraft((current) => ({ ...current, dueDateFilter: option.value }))
                  }
                  style={({ pressed }) => [styles.dateOption, pressed ? styles.pressed : null]}
                >
                  <AppIcon
                    name={option.icon}
                    size={18}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                  <Text style={styles.dateOptionText}>{option.label}</Text>
                  <AppIcon
                    name={selected ? 'active' : 'none'}
                    size={18}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.resetSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset task filters"
            onPress={() => setDraft(defaultFilters)}
            style={({ pressed }) => [styles.resetButton, pressed ? styles.pressed : null]}
          >
            <AppIcon name="refresh" size={16} color={styles.optionIcon.color} decorative />
            <Text style={styles.resetText}>Reset filters</Text>
          </Pressable>
        </View>
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
    dateOptions: { gap: 0 },
    dateOption: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 0,
      borderRadius: theme.radii.sm,
    },
    dateOptionText: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    resetSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: spacing.xs,
    },
    resetButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: 0,
    },
    resetText: { ...typography.helper, color: theme.colors.textPrimary, fontWeight: '600' },
    pressed: { opacity: 0.72 },
  });
