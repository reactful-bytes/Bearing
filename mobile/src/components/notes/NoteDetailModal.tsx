import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../../design/useThemedStyles';
import { AppButton } from '../ui/AppButton';
import { AppModal } from '../ui/AppModal';
import { FormField } from '../ui/FormField';
import { IconButton } from '../ui/IconButton';
import { RowContextMenu } from '../ui/RowContextMenu';
import { NoteReadOnlyDetails } from './NoteReadOnlyDetails';
import { radii, spacing, typography } from '../../design/tokens';
import type { Theme } from '../../design/tokens';
import { NoteRecord, UpdateNoteInput } from '../../features/notes/noteTypes';
import { normalizeNoteLabels } from '../../features/notes/noteLabels';
import { NoteLabelsField } from './NoteLabels';
type NoteDetailModalProps = {
  visible: boolean;
  note: NoteRecord | null;
  initialEditMode?: boolean;
  locale?: string;
  onClose: () => void;
  onSave: (noteId: string, fields: UpdateNoteInput) => Promise<void>;
  onPin: (noteId: string, pinned: boolean) => Promise<void>;
  onArchive: (noteId: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
};

export function NoteDetailModal({
  visible,
  note,
  initialEditMode = false,
  locale,
  onClose,
  onSave,
  onPin,
  onArchive,
  onDelete,
}: NoteDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!note || !visible) {
      return;
    }

    setEditMode(initialEditMode);
    setTitle(note.title);
    setBody(note.body);
    setLabels(note.labels);
    setSaving(false);
    setConfirmingDelete(false);
    setError(null);
  }, [initialEditMode, note, visible]);

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
        labels: normalizeNoteLabels(labels),
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

  async function handlePin(): Promise<void> {
    if (!note) return;

    setSaving(true);
    setError(null);
    try {
      await onPin(note.id, !note.pinned);
    } catch {
      setError('Failed to update note pin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!note) return;

    setSaving(true);
    setError(null);
    try {
      await onArchive(note.id);
      handleClose();
    } catch {
      setError('Failed to archive note.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(): Promise<void> {
    if (!note) return;

    setSaving(true);
    setError(null);
    try {
      await onSave(note.id, {
        title: note.title,
        body: note.body,
        labels: note.labels,
        pinned: note.pinned,
        archived: false,
      });
      handleClose();
    } catch {
      setError('Failed to restore note.');
    } finally {
      setSaving(false);
    }
  }

  const headerAccessory = note ? (
    editMode ? (
      <AppButton
        label="Cancel"
        variant="secondary"
        accessibilityLabel="Cancel note editing"
        onPress={() => {
          setError(null);
          setEditMode(false);
        }}
        style={styles.headerButton}
        textStyle={styles.headerButtonText}
      />
    ) : (
      <RowContextMenu
        accessibilityLabel="More note actions"
        menuAccessibilityLabel="Note actions menu"
        items={[
          {
            label: 'Edit',
            accessibilityLabel: 'Edit note',
            icon: 'edit',
            onPress: () => {
              setError(null);
              setEditMode(true);
            },
          },
          {
            label: note.pinned ? 'Unpin' : 'Pin',
            accessibilityLabel: note.pinned ? 'Unpin note' : 'Pin note',
            icon: note.pinned ? 'pinned' : 'pin',
            onPress: () => void handlePin(),
          },
          {
            label: note.archived ? 'Restore' : 'Archive',
            accessibilityLabel: note.archived ? 'Restore note' : 'Archive note',
            icon: note.archived ? 'refresh' : 'archive',
            onPress: () => {
              if (note.archived) void handleRestore();
              else void handleArchive();
            },
          },
          {
            label: 'Delete',
            accessibilityLabel: 'Delete note',
            icon: 'delete',
            tone: 'danger',
            onPress: () => setConfirmingDelete(true),
          },
        ]}
      />
    )
  ) : null;

  return (
    <AppModal
      visible={visible}
      title="Note Details"
      onClose={handleClose}
      headerAccessory={headerAccessory}
    >
      {note ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
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
              <NoteLabelsField labels={labels} onChange={setLabels} />
            </View>
          ) : (
            <NoteReadOnlyDetails
              note={note}
              locale={locale}
              trailing={
                <IconButton
                  name={note.pinned ? 'pinned' : 'pin'}
                  accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'}
                  onPress={() => void handlePin()}
                  disabled={saving}
                  color={note.pinned ? styles.activeActionIcon.color : styles.actionIcon.color}
                />
              }
            />
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

          {!editMode && confirmingDelete ? (
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
          ) : null}
        </ScrollView>
      ) : null}
    </AppModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: spacing.lg },
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
    actionIcon: { color: theme.colors.textSecondary },
    activeActionIcon: { color: theme.colors.brand },
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
