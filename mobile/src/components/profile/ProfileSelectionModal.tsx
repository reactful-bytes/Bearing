import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../ui/AppCard';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { ProfileSelectionOption } from '../../features/profile/profileOptions';

type ProfileSelectionModalProps = {
  visible: boolean;
  title: string;
  searchPlaceholder: string;
  selectedValue: string;
  options: ProfileSelectionOption[];
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function ProfileSelectionModal({
  visible,
  title,
  searchPlaceholder,
  selectedValue,
  options,
  onClose,
  onSelect,
}: ProfileSelectionModalProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const searchTarget = `${option.label} ${option.value}`.toLowerCase();
      return searchTarget.includes(normalizedQuery);
    });
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
    <AppModal visible={visible} title={title} onClose={handleClose}>
      <View style={styles.content}>
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

          <ScrollView style={styles.scrollList} nestedScrollEnabled>
            {filteredOptions.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${title} ${option.value}`}
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
                  <Text style={styles.optionStatus}>{isSelected ? 'Selected' : 'Choose'}</Text>
                </Pressable>
              );
            })}

            {filteredOptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No results</Text>
                <Text style={styles.emptyStateBody}>
                  Try a city, region, language, or locale code.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </AppCard>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  resultsCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  resultsLabel: {
    ...typography.helper,
    color: colors.textSecondary,
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
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: colors.surfaceBrand,
  },
  optionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
  },
  optionValue: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  optionStatus: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
  emptyState: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emptyStateTitle: {
    ...typography.button,
    color: colors.text,
  },
  emptyStateBody: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
