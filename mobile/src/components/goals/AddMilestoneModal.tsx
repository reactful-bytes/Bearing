import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import {
  GoalDateParts,
  GoalDatePicker,
  buildDefaultGoalDateParts,
  buildGoalDateParts,
  getGoalDateFromParts,
  isTodayOrFutureDate,
} from './GoalDatePicker';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import type { CreateGoalMilestoneInput } from '../../features/goals/goalTypes';

type AddMilestoneModalProps = {
  visible: boolean;
  goalEstimatedCompletionDate?: Date;
  onClose: () => void;
  onSave: (input: Omit<CreateGoalMilestoneInput, 'tasks'>) => Promise<void>;
};

function getInitialTargetDateParts(goalTargetDate?: Date): GoalDateParts {
  const today = new Date();
  const defaultDateParts = buildDefaultGoalDateParts(today);
  if (!goalTargetDate) return defaultDateParts;

  const defaultDate = getGoalDateFromParts(defaultDateParts);
  const normalizedGoalDate = getGoalDateFromParts(buildGoalDateParts(goalTargetDate));
  return isTodayOrFutureDate(normalizedGoalDate, today) && normalizedGoalDate < defaultDate
    ? buildGoalDateParts(normalizedGoalDate)
    : defaultDateParts;
}

export function AddMilestoneModal({
  visible,
  goalEstimatedCompletionDate,
  onClose,
  onSave,
}: AddMilestoneModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateParts, setDateParts] = useState(() =>
    getInitialTargetDateParts(goalEstimatedCompletionDate),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setDateParts(getInitialTargetDateParts(goalEstimatedCompletionDate));
  }, [goalEstimatedCompletionDate, visible]);

  function handleClose(): void {
    setTitle('');
    setDescription('');
    setDateParts(getInitialTargetDateParts(goalEstimatedCompletionDate));
    setError(null);
    setSaving(false);
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setError('Milestone name is required.');
      return;
    }
    const estimatedFinishDate = getGoalDateFromParts(dateParts);
    const today = new Date();
    if (!isTodayOrFutureDate(estimatedFinishDate, today)) {
      setError('Milestone target date must be today or later.');
      return;
    }
    if (
      goalEstimatedCompletionDate &&
      estimatedFinishDate.getTime() >
        getGoalDateFromParts(buildGoalDateParts(goalEstimatedCompletionDate)).getTime()
    ) {
      setError('Milestone must finish on or before the goal target date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        estimatedFinishDate,
      });
      handleClose();
    } catch {
      setError('Failed to save milestone. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      visible={visible}
      title="Add Milestone"
      onClose={handleClose}
      fullScreen
      fullScreenEdgeToEdge
      hideHeader
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing['2xl'] + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Add Milestone"
          onPressBack={handleClose}
          backAccessibilityLabel="Close Add Milestone"
        />
        <FormField
          label="Milestone name"
          accessibilityLabel="Milestone name"
          value={title}
          onChangeText={setTitle}
          placeholder="Name an important outcome"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <FormField
          label="Description"
          accessibilityLabel="Milestone description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What will reaching this milestone mean?"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <GoalDatePicker
          title="Milestone target date"
          accessibilityPrefix="new milestone target"
          dateParts={dateParts}
          onSelectDate={(date) => {
            setDateParts(buildGoalDateParts(date));
            setError(null);
          }}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <AppButton
          label="Save Milestone"
          accessibilityLabel="Save milestone"
          onPress={handleSave}
          loading={saving}
          loadingLabel="Saving..."
        />
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) => ({
  scrollView: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.lg },
  errorText: { ...typography.helper, color: theme.colors.dangerText, marginTop: spacing.xs },
});
