import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { NoteRecord, UpdateNoteInput } from '../../features/notes/noteTypes';
import {
  DEFAULT_TIME_FORMAT,
  TimeFormat,
  timeFormatOptions,
} from '../../features/profile/timeFormat';

type NoteDetailModalProps = {
  visible: boolean;
  note: NoteRecord | null;
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSave: (noteId: string, fields: UpdateNoteInput) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
};

function formatDateTime(date: Date, timeFormat: TimeFormat, locale?: string): string {
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(timeFormat),
  });
}

function noteSourceLabel(note: NoteRecord): string {
  return note.source === 'idea_dump' ? 'Idea Dump' : 'Manual Note';
}

export function NoteDetailModal({
  visible,
  note,
  locale,
  timeFormat = DEFAULT_TIME_FORMAT,
  onClose,
  onSave,
  onDelete,
}: NoteDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!note || !visible) {
      return;
    }

    setEditMode(false);
    setTitle(note.title);
    setBody(note.body);
    setSaving(false);
    setConfirmingDelete(false);
    setError(null);
  }, [note, visible]);

  function handleClose(): void {
    setEditMode(false);
    setSaving(false);
    setConfirmingDelete(false);
    setError(null);
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!note) {
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError('Note body is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(note.id, {
        title: title.trim(),
        body: trimmedBody,
      });
      setEditMode(false);
      setConfirmingDelete(false);
    } catch {
      setError('Failed to save note changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!note) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onDelete(note.id);
      handleClose();
    } catch {
      setError('Failed to delete note.');
    } finally {
      setSaving(false);
    }
  }

  const headerAccessory = note ? (
    <AppButton
      label={editMode ? 'Cancel' : 'Edit'}
      variant="secondary"
      accessibilityLabel={editMode ? 'Cancel note editing' : 'Edit note'}
      onPress={() => {
        setError(null);
        setConfirmingDelete(false);
        setEditMode((current) => !current);
      }}
      style={styles.headerButton}
      textStyle={styles.headerButtonText}
    />
  ) : null;

  return (
    <AppModal
      visible={visible}
      title="Note Details"
      onClose={handleClose}
      headerAccessory={headerAccessory}
    >
      {note ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.noteSource}>{noteSourceLabel(note)}</Text>
            <Text style={styles.noteDate}>
              Updated {formatDateTime(note.updatedAt, timeFormat, locale)}
            </Text>
          </AppCard>

          {editMode ? (
            <View style={styles.section}>
              <FormField
                label="Title"
                accessibilityLabel="Edit note title"
                value={title}
                onChangeText={setTitle}
                placeholder="Optional title"
              />

              <FormField
                label="Body"
                accessibilityLabel="Edit note body"
                value={body}
                onChangeText={setBody}
                multiline
                error={error}
              />
            </View>
          ) : (
            <AppCard style={styles.readOnlyCard}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteBody}>{note.body}</Text>
            </AppCard>
          )}

          {!editMode && error ? <Text style={styles.errorText}>{error}</Text> : null}

          {editMode ? (
            <AppButton
              label="Save Changes"
              accessibilityLabel="Save note changes"
              onPress={handleSave}
              loading={saving}
              loadingLabel="Saving..."
            />
          ) : null}

          {!confirmingDelete ? (
            <AppButton
              label="Delete Note"
              variant="danger"
              accessibilityLabel="Delete note"
              onPress={() => setConfirmingDelete(true)}
            />
          ) : (
            <View style={styles.confirmBlock}>
              <Text style={styles.confirmText}>Delete this note permanently?</Text>
              <View style={styles.confirmActions}>
                <AppButton
                  label="Cancel"
                  variant="secondary"
                  accessibilityLabel="Cancel note delete"
                  onPress={() => setConfirmingDelete(false)}
                  style={styles.flexButton}
                />
                <AppButton
                  label="Yes, Delete"
                  variant="danger"
                  accessibilityLabel="Confirm note delete"
                  onPress={handleDelete}
                  loading={saving}
                  loadingLabel="Deleting..."
                  style={styles.flexButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    summaryCard: {
      gap: spacing.xs,
    },
    readOnlyCard: {
      gap: spacing.md,
    },
    section: {
      gap: spacing.md,
    },
    fieldGroup: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: theme.colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    textArea: {
      minHeight: 180,
    },
    noteSource: {
      ...typography.label,
      color: theme.colors.brand,
    },
    noteDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    noteTitle: {
      ...typography.button,
      fontSize: 18,
      color: theme.colors.text,
    },
    noteBody: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    errorText: {
      ...typography.helper,
      color: theme.colors.dangerText,
    },
    headerButton: {
      minHeight: 44,
    },
    headerButtonText: {
      ...typography.helper,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    primaryButton: {
      borderRadius: radii.md,
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.colors.surface,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      ...typography.button,
      color: theme.colors.textPrimary,
    },
    dangerButton: {
      borderRadius: radii.md,
      backgroundColor: theme.colors.dangerSurface,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    dangerButtonText: {
      ...typography.button,
      color: theme.colors.dangerText,
    },
    confirmBlock: {
      gap: spacing.sm,
    },
    confirmText: {
      ...typography.body,
      color: theme.colors.text,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    flexButton: {
      flex: 1,
    },
    confirmDeleteButton: {
      flex: 1,
      borderRadius: radii.md,
      backgroundColor: theme.colors.dangerSurface,
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    confirmDeleteButtonText: {
      ...typography.button,
      color: theme.colors.dangerText,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
