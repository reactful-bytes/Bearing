import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GoalFilter } from '../presentation/GoalPresentation';
import { spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { AppModal } from '../ui/AppModal';
import { ModalHeaderAction } from '../ui/ModalHeaderAction';

export type GoalFilterOption = { value: GoalFilter; label: string; count: number };
export type GoalTargetDateFilter = 'any' | 'pastDue' | 'thisWeek' | 'thisMonth';

const TARGET_DATE_OPTIONS = [
  { value: 'any', label: 'Any', icon: 'date' },
  { value: 'pastDue', label: 'Past due', icon: 'warning' },
  { value: 'thisWeek', label: 'This week', icon: 'dayView' },
  { value: 'thisMonth', label: 'This month', icon: 'monthView' },
] as const;

type GoalFilterModalProps = {
  visible: boolean;
  selectedFilter: GoalFilter;
  selectedTargetDateFilter: GoalTargetDateFilter;
  options: readonly GoalFilterOption[];
  onClose: () => void;
  onApply: (filter: GoalFilter, targetDateFilter: GoalTargetDateFilter) => void;
};

export function GoalFilterModal({
  visible,
  selectedFilter,
  selectedTargetDateFilter,
  options,
  onClose,
  onApply,
}: GoalFilterModalProps) {
  const styles = useThemedStyles(createStyles);
  const [draftFilter, setDraftFilter] = useState(selectedFilter);
  const [draftTargetDateFilter, setDraftTargetDateFilter] = useState(selectedTargetDateFilter);

  useEffect(() => {
    if (visible) {
      setDraftFilter(selectedFilter);
      setDraftTargetDateFilter(selectedTargetDateFilter);
    }
  }, [selectedFilter, selectedTargetDateFilter, visible]);

  return (
    <AppModal
      visible={visible}
      title="Filter goals"
      onClose={onClose}
      dragToClose
      centeredHeader
      hideCloseButton
      headerAccessory={
        <ModalHeaderAction
          accessibilityLabel="Apply goal filters"
          onPress={() => onApply(draftFilter, draftTargetDateFilter)}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusSection}>
          <Text style={styles.sectionLabel}>Status</Text>
          <View style={styles.statusOptions}>
            {options.map((option) => {
              const selected = draftFilter === option.value;
              const accessibleLabel =
                option.value === 'all'
                  ? 'Show all goals'
                  : `Show ${option.label.toLowerCase()} goals`;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={accessibleLabel}
                  accessibilityState={{ selected }}
                  onPress={() => setDraftFilter(option.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    styles.statusOptionRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <AppIcon
                    name={option.value === 'all' ? 'goalsOutline' : 'archive'}
                    size={18}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Text style={styles.optionCount}>{option.count}</Text>
                  {selected ? (
                    <AppIcon
                      name="complete"
                      size={16}
                      color={styles.selectedIcon.color}
                      decorative
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.dateSection}>
          <Text style={styles.sectionLabel}>Target date</Text>
          <View accessibilityLabel="Goal target date filter" style={styles.dateOptions}>
            {TARGET_DATE_OPTIONS.map((option) => {
              const selected = draftTargetDateFilter === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => setDraftTargetDateFilter(option.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    styles.dateOptionRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <AppIcon
                    name={option.icon}
                    size={18}
                    color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                    decorative
                  />
                  <Text style={styles.optionText}>{option.label}</Text>
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
            accessibilityLabel="Reset goal filters"
            onPress={() => {
              setDraftFilter('active');
              setDraftTargetDateFilter('any');
            }}
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
    sectionLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    options: { gap: spacing.xs },
    statusSection: { gap: spacing.sm },
    statusOptions: { gap: 0 },
    dateOptions: { gap: 0 },
    optionRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.sm,
    },
    statusOptionRow: { minHeight: 44, paddingHorizontal: 0 },
    dateOptionRow: { minHeight: 44, paddingHorizontal: 0 },
    optionText: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    optionCount: { ...typography.caption, color: theme.colors.textSecondary },
    dateSection: { gap: spacing.sm },
    resetSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: spacing.xs,
    },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
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
