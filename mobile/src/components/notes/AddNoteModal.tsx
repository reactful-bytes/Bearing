import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { ScreenHeader } from '../ui/ScreenHeader';
import { radii, spacing, typography } from '../../design/tokens';
import { useThemedStyles } from '../../design/useThemedStyles';
import type { Theme } from '../../design/tokens';
import { CreateNoteInput } from '../../features/notes/noteTypes';

type AddNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateNoteInput) => Promise<void>;
  sourceEventId?: string | null;
  sourceStepId?: string | null;
  fullScreen?: boolean;
};

export function AddNoteModal({
  visible,
  onClose,
  onSave,
  sourceEventId = null,
  sourceStepId = null,
  fullScreen = false,
}: AddNoteModalProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm(): void {
    setTitle('');
    setBody('');
    setError(null);
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  async function handleSave(): Promise<void> {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError('Note body is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        body: trimmedBody,
        source: 'manual',
        sourceEventId,
        sourceStepId,
      });
      handleClose();
    } catch {
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      visible={visible}
      title="New Note"
      onClose={handleClose}
      fullScreen={fullScreen}
      hideHeader={fullScreen}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          fullScreen ? { paddingTop: insets.top, paddingBottom: spacing.sm + insets.bottom } : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {fullScreen ? <ScreenHeader title="New Note" onPressBack={handleClose} /> : null}
        <FormField
          label="Title"
          accessibilityLabel="Note title"
          placeholder="Optional title"
          value={title}
          onChangeText={setTitle}
          labelStyle={styles.fieldLabel}
          inputStyle={styles.input}
        />

        <FormField
          label="Body"
          accessibilityLabel="Note body"
          placeholder="Write your note..."
          value={body}
          onChangeText={setBody}
          multiline
          error={error}
          labelStyle={styles.fieldLabel}
          inputStyle={styles.textArea}
        />

        <AppButton
          label="Save Note"
          accessibilityLabel="Save note"
          onPress={handleSave}
          loading={saving}
          loadingLabel="Saving..."
        />
      </ScrollView>
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flexShrink: 1,
    },
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.sm,
    },
    fieldLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 40,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
    },
    textArea: {
      minHeight: 180,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
    },
  });
