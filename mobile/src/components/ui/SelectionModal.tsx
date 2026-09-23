import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from './AppCard';
import { AppModal } from './AppModal';
import { FormField } from './FormField';
import { ScreenHeader } from './ScreenHeader';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

export type SelectionOption = {
  value: string;
  label: string;
};

type SelectionModalProps = {
  visible: boolean;
  title: string;
  searchPlaceholder: string;
  selectedValue: string;
  options: SelectionOption[];
  emptyStateDescription?: string;
  selectedLabel?: string;
  unselectedLabel?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function SelectionModal({
  visible,
  title,
  searchPlaceholder,
  selectedValue,
  options,
  emptyStateDescription = 'Try a different search.',
  selectedLabel = 'Selected',
  unselectedLabel = 'Choose',
  onClose,
  onSelect,
}: SelectionModalProps) {
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  function handleClose(): void {
    setQuery('');
    onClose();
  }

  function handleSelect(value: string): void {
    setQuery('');
    onSelect(value);
  }

  return (
    <AppModal visible={visible} onClose={handleClose} hideHeader>
      <View style={styles.content}>
        <ScreenHeader
          title={title}
          onPressBack={handleClose}
          backAccessibilityLabel={`Back from ${title}`}
        />
        <FormField
          label="Search"
          accessibilityLabel={`${title} search`}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          autoCapitalize="none"
        />

        <AppCard style={styles.resultsCard}>
          <Text style={styles.resultsLabel}>{filteredOptions.length} options</Text>
          <ScrollView
            style={styles.scrollList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filteredOptions.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${title} ${option.value}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelect(option.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    isSelected ? styles.optionRowSelected : null,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionValue}>{option.value}</Text>
                  </View>
                  <Text style={styles.optionStatus}>
                    {isSelected ? selectedLabel : unselectedLabel}
                  </Text>
                </Pressable>
              );
            })}

            {filteredOptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No results</Text>
                <Text style={styles.emptyStateBody}>{emptyStateDescription}</Text>
              </View>
            ) : null}
          </ScrollView>
        </AppCard>
      </View>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    resultsCard: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    resultsLabel: {
      ...typography.helper,
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    scrollList: {
      maxHeight: 320,
    },
    optionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderRadius: theme.radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionRowSelected: {
      backgroundColor: theme.colors.surfaceBrand,
    },
    optionCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    optionLabel: {
      ...typography.body,
      color: theme.colors.text,
    },
    optionValue: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    optionStatus: {
      ...typography.helper,
      color: theme.colors.brand,
      fontWeight: '600',
    },
    emptyState: {
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    emptyStateTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    emptyStateBody: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    buttonPressed: {
      opacity: 0.85,
    },
  });
