import { useState } from 'react';
import { Text } from 'react-native';

import { useTheme } from '../../design/ThemeProvider';
import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';

type AddMilestoneModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: { title: string; description: string }) => Promise<void>;
};

export function AddMilestoneModal({ visible, onClose, onSave }: AddMilestoneModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose(): void {
    setTitle('');
    setDescription('');
    setError(null);
    setSaving(false);
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setError('Milestone name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
      handleClose();
    } catch {
      setError('Failed to save milestone. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="Add Milestone" onClose={handleClose}>
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AppButton
        label="Save Milestone"
        accessibilityLabel="Save milestone"
        onPress={handleSave}
        loading={saving}
        loadingLabel="Saving..."
      />
    </AppModal>
  );
}

const createStyles = (theme: Theme) => ({
  errorText: {
    ...typography.helper,
    color: theme.colors.dangerText,
    marginTop: spacing.xs,
  },
});
