import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import { IconButton } from './IconButton';

type FilterSortToolbarProps = {
  filterSummary: string;
  sortSummary: string;
  filterAccessibilityLabel: string;
  sortAccessibilityLabel: string;
  onPressFilter: () => void;
  onPressSort: () => void;
  testID?: string;
};

export function FilterSortToolbar({
  filterSummary,
  sortSummary,
  filterAccessibilityLabel,
  sortAccessibilityLabel,
  onPressFilter,
  onPressSort,
  testID,
}: FilterSortToolbarProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.summaries}>
        <Text numberOfLines={1} style={styles.filterSummary}>
          Filters: {filterSummary}
        </Text>
        <Text numberOfLines={1} style={styles.sortSummary}>
          Sort: {sortSummary}
        </Text>
      </View>
      <IconButton
        name="filter"
        accessibilityLabel={filterAccessibilityLabel}
        onPress={onPressFilter}
        color={styles.actionIcon.color}
        style={styles.actionButton}
        testID={testID ? `${testID}-filter` : undefined}
      />
      <IconButton
        name="sort"
        accessibilityLabel={sortAccessibilityLabel}
        onPress={onPressSort}
        color={styles.actionIcon.color}
        style={styles.actionButton}
        testID={testID ? `${testID}-sort` : undefined}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    summaries: { flex: 1, minWidth: 0, gap: 2 },
    filterSummary: { ...typography.caption, color: theme.colors.textPrimary },
    sortSummary: { ...typography.caption, color: theme.colors.textSecondary },
    actionButton: { borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceRaised },
    actionIcon: { color: theme.colors.textSecondary },
  });
