import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NoteViewDraft } from '../../features/notes/noteTypes';
import { spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { AppIcon } from '../ui/AppIcon';
import { AppModal } from '../ui/AppModal';
import { ModalHeaderAction } from '../ui/ModalHeaderAction';
import { SegmentedControl } from '../ui/SegmentedControl';

type NoteFilterModalProps = {
  visible: boolean;
  draft: NoteViewDraft;
  labels: string[];
  onClose: () => void;
  onApply: (draft: NoteViewDraft) => void;
};

export function NoteFilterModal({
  visible,
  draft: initialDraft,
  labels,
  onClose,
  onApply,
}: NoteFilterModalProps) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    if (visible) setDraft(initialDraft);
  }, [initialDraft, visible]);

  function toggleLabel(label: string): void {
    setDraft((current) => {
      const selected = new Set(current.selectedLabels.map((item) => item.toLowerCase()));
      const normalizedLabel = label.toLowerCase();
      if (selected.has(normalizedLabel)) selected.delete(normalizedLabel);
      else selected.add(normalizedLabel);
      return {
        ...current,
        selectedLabels: labels.filter((item) => selected.has(item.toLowerCase())),
      };
    });
  }

  function reset(): void {
    setDraft((current) => ({
      ...current,
      archivedOnly: false,
      pinnedOnly: false,
      selectedLabels: [],
    }));
  }

  return (
    <AppModal
      visible={visible}
      title="Filter notes"
      onClose={onClose}
      dragToClose
      centeredHeader
      hideCloseButton
      headerAccessory={
        <ModalHeaderAction
          accessibilityLabel="Apply note filters"
          onPress={() => onApply(draft)}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <SegmentedControl
            accessibilityLabel="Note status filter"
            options={[
              { value: 'active', label: 'Active', icon: 'active' },
              { value: 'archived', label: 'Archived', icon: 'archived' },
            ]}
            value={draft.archivedOnly ? 'archived' : 'active'}
            onChange={(value) =>
              setDraft((current) => ({ ...current, archivedOnly: value === 'archived' }))
            }
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pinned</Text>
          <SegmentedControl
            accessibilityLabel="Pinned note filter"
            options={[
              { value: 'all', label: 'All notes', icon: 'notes' },
              { value: 'pinned', label: 'Pinned only', icon: 'pinned' },
            ]}
            value={draft.pinnedOnly ? 'pinned' : 'all'}
            onChange={(value) =>
              setDraft((current) => ({ ...current, pinnedOnly: value === 'pinned' }))
            }
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Labels</Text>
          {labels.length > 0 ? (
            <View style={styles.options}>
              {labels.map((label) => {
                const selected = draft.selectedLabels.some(
                  (item) => item.toLowerCase() === label.toLowerCase(),
                );
                return (
                  <Pressable
                    key={label.toLowerCase()}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Filter notes by ${label}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleLabel(label)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected ? styles.optionSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppIcon
                      name="tags"
                      size={18}
                      color={selected ? styles.selectedIcon.color : styles.optionIcon.color}
                      decorative
                    />
                    <Text style={styles.optionText}>{label}</Text>
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
          ) : (
            <Text style={styles.helperText}>No labels yet</Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset note filters"
          onPress={reset}
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
    options: { gap: spacing.xs },
    optionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.sm,
    },
    optionSelected: { backgroundColor: theme.colors.surfaceBrand },
    optionText: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    selectedIcon: { color: theme.colors.brand },
    optionIcon: { color: theme.colors.textSecondary },
    helperText: { ...typography.helper, color: theme.colors.textSecondary },
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