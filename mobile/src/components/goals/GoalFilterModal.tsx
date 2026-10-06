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

type GoalFilterModalProps = {
  visible: boolean;
  selectedFilter: GoalFilter;
  options: readonly GoalFilterOption[];
  onClose: () => void;
  onApply: (filter: GoalFilter) => void;
};

export function GoalFilterModal({
  visible,
  selectedFilter,
  options,
  onClose,
  onApply,
}: GoalFilterModalProps) {
  const styles = useThemedStyles(createStyles);
  const [draftFilter, setDraftFilter] = useState(selectedFilter);

  useEffect(() => {
    if (visible) setDraftFilter(selectedFilter);
  }, [selectedFilter, visible]);

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
          onPress={() => onApply(draftFilter)}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.options}>
          {options.map((option) => {
            const selected = draftFilter === option.value;
            const accessibleLabel =
              option.value === 'all' ? 'Show all goals' : `Show ${option.label.toLowerCase()} goals`;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={accessibleLabel}
                accessibilityState={{ selected }}
                onPress={() => setDraftFilter(option.value)}
                style={({ pressed }) => [styles.optionRow, pressed ? styles.pressed : null]}
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
                  <AppIcon name="complete" size={16} color={styles.selectedIcon.color} decorative />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset goal filters"
          onPress={() => setDraftFilter('active')}
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
    options: { gap: spacing.xs },
    optionRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.sm,
    },
    optionText: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    optionCount: { ...typography.caption, color: theme.colors.textSecondary },
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