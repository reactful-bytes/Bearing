import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../../design/useThemedStyles';
import { GoalMilestoneWithTasks } from '../../features/goals/goalTypes';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import {
  GoalDatePicker,
  buildGoalDateParts,
  getGoalDateFromParts,
  isTodayOrFutureDate,
} from './GoalDatePicker';

type EditMilestoneModalProps = {
  milestone: GoalMilestoneWithTasks;
  visible: boolean;
  embedded?: boolean;
  backAccessibilityLabel?: string;
  goalEstimatedCompletionDate?: Date;
  onClose: () => void;
  onSaveMilestone: (
    milestoneId: string,
    fields: { title: string; description: string; estimatedFinishDate?: Date | null },
  ) => Promise<void>;
};

export function EditMilestoneModal({
  milestone,
  visible,
  embedded = false,
  backAccessibilityLabel = 'Back to milestone details',
  goalEstimatedCompletionDate,
  onClose,
  onSaveMilestone,
}: EditMilestoneModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const actionInFlight = useRef(false);
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description);
  const [expectedFinishDate, setExpectedFinishDate] = useState<Date | null>(
    milestone.estimatedFinishDate,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(milestone.title);
    setDescription(milestone.description);
    setExpectedFinishDate(milestone.estimatedFinishDate);
    setSaving(false);
    setError(null);
  }, [milestone, visible]);

  async function handleSave(): Promise<void> {
    if (actionInFlight.current) return;
    if (!title.trim()) {
      setError('Milestone name is required.');
      return;
    }
    const dateChanged =
      expectedFinishDate?.toDateString() !== milestone.estimatedFinishDate?.toDateString();
    if (dateChanged && expectedFinishDate) {
      if (!isTodayOrFutureDate(expectedFinishDate, new Date())) {
        setError('Expected completion date must be today or later.');
        return;
      }
      if (
        goalEstimatedCompletionDate &&
        expectedFinishDate.getTime() >
          getGoalDateFromParts(buildGoalDateParts(goalEstimatedCompletionDate)).getTime()
      ) {
        setError('Milestone must finish on or before the goal completion date.');
        return;
      }
    }

    actionInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSaveMilestone(milestone.id, {
        title: title.trim(),
        description: description.trim(),
        ...(dateChanged ? { estimatedFinishDate: expectedFinishDate } : {}),
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save milestone changes.',
      );
    } finally {
      actionInFlight.current = false;
      setSaving(false);
    }
  }

  function handleClose(): void {
    if (actionInFlight.current) return;
    onClose();
  }

  return (
    <AppModal
      visible={visible}
      title="Edit Milestone"
      onClose={handleClose}
      fullScreen
      fullScreenEdgeToEdge
      hideHeader
      embedded={embedded}
    >
      <ScrollView
        testID="edit-milestone-scroll"
        style={embedded ? styles.scrollView : undefined}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          embedded ? { paddingHorizontal: spacing.lg } : null,
          { paddingTop: insets.top, paddingBottom: spacing['3xl'] + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Edit Milestone"
          onPressBack={handleClose}
          backAccessibilityLabel={backAccessibilityLabel}
        />
        <View style={styles.section}>
          <FormField
            label="Milestone name"
            accessibilityLabel="Edit milestone name"
            value={title}
            onChangeText={setTitle}
          />
          <FormField
            label="Description"
            accessibilityLabel="Edit milestone description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {expectedFinishDate ? (
            <GoalDatePicker
              title="Expected completion date"
              accessibilityPrefix="edit milestone"
              dateParts={buildGoalDateParts(expectedFinishDate)}
              onSelectDate={(date) => {
                setExpectedFinishDate(date);
                setError(null);
              }}
            />
          ) : (
            <View style={styles.unsetDate}>
              <Text style={styles.infoValue}>Expected completion date: Not set</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set milestone expected completion date"
                onPress={() => {
                  setExpectedFinishDate(getGoalDateFromParts(buildGoalDateParts(new Date())));
                  setError(null);
                }}
                style={({ pressed }) => [styles.addDateButton, pressed && styles.pressed]}
              >
                <Text style={styles.addDateText}>+ Set expected completion date</Text>
              </Pressable>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <AppButton
            label="Save Changes"
            accessibilityLabel="Save milestone changes"
            onPress={() => void handleSave()}
            loading={saving}
          />
        </View>
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    content: { flexGrow: 1, gap: spacing.md },
    section: { gap: spacing.md },
    unsetDate: { gap: spacing.sm },
    addDateButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: theme.radii.md,
    },
    addDateText: { ...typography.label, color: theme.colors.brand, fontWeight: '700' },
    pressed: { opacity: 0.68 },
    infoValue: { ...typography.body, color: theme.colors.textPrimary },
    errorText: { ...typography.helper, color: theme.colors.dangerText },
  });
