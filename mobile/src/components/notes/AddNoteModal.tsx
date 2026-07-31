import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppModal } from '../ui/AppModal';
import { colors, radii, spacing, typography } from '../../design/tokens';
import { CreateNoteInput } from '../../features/notes/noteTypes';

type AddNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CreateNoteInput) => Promise<void>;
};

export function AddNoteModal({ visible, onClose, onSave }: AddNoteModalProps) {
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
      });
      handleClose();
    } catch {
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} title="New Note" onClose={handleClose}>
      <View style={styles.formField}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          accessibilityLabel="Note title"
          placeholder="Optional title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.label}>Body</Text>
        <TextInput
          accessibilityLabel="Note body"
          placeholder="Write your note..."
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save note"
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,
          pressed && !saving ? styles.saveButtonPressed : null,
          saving ? styles.saveButtonDisabled : null,
        ]}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Note'}</Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  formField: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textArea: {
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  saveButton: {
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
