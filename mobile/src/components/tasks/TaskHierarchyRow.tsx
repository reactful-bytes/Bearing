import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIconName } from '../../design/icons';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { spacing, typography } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';

type TaskHierarchyRowProps = {
  title: string;
  kind: 'goal' | 'milestone' | 'unlinked';
  detail?: string;
  countLabel?: string;
  nested?: boolean;
  selected?: boolean;
  expanded?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onToggleExpanded?: () => void;
  testID?: string;
};

const ROW_ICONS: Record<TaskHierarchyRowProps['kind'], AppIconName> = {
  goal: 'goal',
  milestone: 'goalMilestone',
  unlinked: 'tasks',
};

export function TaskHierarchyRow({
  title,
  kind,
  detail,
  countLabel,
  nested = false,
  selected = false,
  expanded,
  accessibilityLabel,
  onPress,
  onToggleExpanded,
  testID,
}: TaskHierarchyRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View testID={testID} style={[styles.row, nested ? styles.nestedRow : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, expanded }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.main,
          selected ? styles.selected : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={[styles.iconFrame, styles[`${kind}IconFrame`]]}>
          <AppIcon
            name={ROW_ICONS[kind]}
            size={18}
            color={styles[`${kind}Icon`].color}
            decorative
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>
            {kind === 'goal' ? 'GOAL' : kind === 'milestone' ? 'MILESTONE' : 'TASK LIST'}
          </Text>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {detail ? (
            <Text numberOfLines={1} style={styles.detail}>
              {detail}
            </Text>
          ) : null}
        </View>
        {countLabel ? <Text style={styles.count}>{countLabel}</Text> : null}
        {selected && !onToggleExpanded ? (
          <AppIcon name="complete" size={18} color={styles.selectedMark.color} decorative />
        ) : null}
      </Pressable>
      {onToggleExpanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${kind} ${title}`}
          accessibilityState={{ expanded }}
          onPress={onToggleExpanded}
          style={({ pressed }) => [styles.expandButton, pressed ? styles.pressed : null]}
        >
          <AppIcon
            name={expanded ? 'collapse' : 'expand'}
            size={18}
            color={styles.detail.color}
            decorative
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
    },
    nestedRow: {
      marginLeft: spacing.lg,
    },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: theme.radii.md,
    },
    selected: { backgroundColor: theme.colors.surfaceBrand },
    iconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    goalIconFrame: { backgroundColor: theme.colors.surfaceBrand },
    milestoneIconFrame: { backgroundColor: theme.colors.surfaceMuted },
    unlinkedIconFrame: { backgroundColor: theme.colors.surfaceMuted },
    goalIcon: { color: theme.colors.brand },
    milestoneIcon: { color: theme.colors.importedCyan },
    unlinkedIcon: { color: theme.colors.textSecondary },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    eyebrow: { ...typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
    title: { ...typography.helper, color: theme.colors.text, fontWeight: '600' },
    detail: { ...typography.caption, color: theme.colors.textSecondary },
    count: { ...typography.caption, color: theme.colors.textSecondary },
    selectedMark: { color: theme.colors.brand },
    expandButton: {
      width: theme.layout.minimumTouchTarget,
      height: theme.layout.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
    },
    pressed: { opacity: 0.72 },
  });
