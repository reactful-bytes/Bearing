import { useEffect, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { FormField } from '../components/ui/FormField';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { NotesStackParamList } from '../navigation/navigationTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, timeFormatOptions } from '../features/profile/timeFormat';

type NoteEditorScreenProps = {
  route?: { params?: NotesStackParamList['NoteEditor'] };
  navigation?: { goBack: () => void };
};

function formatDateTime(date: Date, locale?: string): string {
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...timeFormatOptions(DEFAULT_TIME_FORMAT),
  });
}

export function NoteEditorScreen({ route, navigation }: NoteEditorScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const stackNavigation = useNavigation<NavigationProp<NotesStackParamList>>();
  const { profile } = useUserProfile();
  const {
    notes,
    uiState,
    createNote: createFromCollection,
    updateNote,
    archiveNote,
    deleteNote,
  } = useNotes();
  const noteId = route?.params?.noteId ?? null;
  const note = useMemo(() => notes.find((item) => item.id === noteId) ?? null, [noteId, notes]);
  const isEditing = noteId !== null;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!note) {
      if (!isEditing) {
        setTitle('');
        setBody('');
        setPinned(false);
      }
      return;
    }

    setTitle(note.title);
    setBody(note.body);
    setPinned(note.pinned);
    setError(null);
    setConfirmingDelete(false);
  }, [isEditing, note]);

  async function handleSave(): Promise<void> {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError('Note body is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setConfirmingDelete(false);

    try {
      if (isEditing && note) {
        await updateNote(note.id, { title: title.trim(), body: trimmedBody, pinned });
      } else {
        await createFromCollection({
          title: title.trim(),
          body: trimmedBody,
          source: 'manual',
          sourceEventId: route?.params?.sourceEventId ?? null,
          sourceStepId: route?.params?.sourceStepId ?? null,
          pinned,
        });
      }
      navigation?.goBack();
    } catch {
      setError(isEditing ? 'Failed to save note changes.' : 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!note) return;

    setSaving(true);
    setError(null);
    try {
      await archiveNote(note.id, { title, body, pinned });
      navigation?.goBack();
    } catch {
      setError('Failed to archive note.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!note) return;

    setSaving(true);
    setError(null);
    try {
      await deleteNote(note.id);
      navigation?.goBack();
    } catch {
      setError('Failed to delete note.');
    } finally {
      setSaving(false);
    }
  }

  function openConversion(
    screen: 'CreateGoalFromNote' | 'CreateTaskFromNote' | 'CreateEventFromNote',
  ): void {
    if (!note) return;
    stackNavigation.navigate(screen, { noteId: note.id });
  }

  if (isEditing && uiState === 'loading' && !note) {
    return (
      <AppScreen mode="scroll" testID="note-editor-loading">
        <Text style={styles.stateTitle}>Loading note...</Text>
      </AppScreen>
    );
  }

  if (isEditing && !note) {
    return (
      <AppScreen mode="scroll" testID="note-editor-missing">
        <Text style={styles.stateTitle}>Note unavailable.</Text>
        <Text style={styles.stateDescription}>This note may have been deleted or archived.</Text>
        <AppButton label="Back to Notes" onPress={navigation?.goBack} />
      </AppScreen>
    );
  }

  return (
    <AppScreen mode="scroll" testID="note-editor-screen">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{isEditing ? 'Edit Note' : 'New Note'}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {isEditing
              ? 'Shape the thought into something useful.'
              : 'Capture the thought while it is clear.'}
          </Text>
          {note ? (
            <Text style={styles.updatedAt}>
              Updated {formatDateTime(note.updatedAt, profile?.locale)}
            </Text>
          ) : null}
        </View>

        <AppCard style={styles.formCard}>
          <FormField
            label="Title"
            accessibilityLabel="Note title"
            placeholder="Optional title"
            value={title}
            onChangeText={setTitle}
          />
          <FormField
            label="Content"
            accessibilityLabel="Note body"
            placeholder="Write your note..."
            value={body}
            onChangeText={setBody}
            multiline
            error={error}
          />
          <AppButton
            label={pinned ? 'Unpin note' : 'Pin note'}
            variant="secondary"
            accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
            onPress={() => setPinned((current) => !current)}
          />
          <AppButton
            label={isEditing ? 'Save Changes' : 'Save Note'}
            accessibilityLabel={isEditing ? 'Save note changes' : 'Save note'}
            onPress={handleSave}
            loading={saving}
            loadingLabel="Saving..."
          />
        </AppCard>

        {note ? (
          <AppCard style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Use this note</Text>
            <Text style={styles.sectionDescription}>
              Start a draft from this context, then edit it before committing.
            </Text>
            <View style={styles.actionRow}>
              <AppButton
                label="Create Task"
                onPress={() => openConversion('CreateTaskFromNote')}
                style={styles.actionButton}
              />
              <AppButton
                label="Create Goal"
                onPress={() => openConversion('CreateGoalFromNote')}
                style={styles.actionButton}
              />
            </View>
            <AppButton
              label="Create Event"
              variant="secondary"
              onPress={() => openConversion('CreateEventFromNote')}
            />
          </AppCard>
        ) : null}

        {note ? (
          <View style={styles.dangerActions}>
            <AppButton
              label="Archive Note"
              variant="secondary"
              onPress={handleArchive}
              loading={saving}
            />
            {!confirmingDelete ? (
              <AppButton
                label="Delete Note"
                variant="danger"
                onPress={() => setConfirmingDelete(true)}
              />
            ) : (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmText}>Delete this note permanently?</Text>
                <View style={styles.actionRow}>
                  <AppButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                    style={styles.actionButton}
                  />
                  <AppButton
                    label="Yes, Delete"
                    variant="danger"
                    accessibilityLabel="Confirm note delete"
                    onPress={handleDelete}
                    loading={saving}
                    loadingLabel="Deleting..."
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { gap: theme.spacing.lg },
    header: { gap: theme.spacing.sm },
    eyebrow: { ...theme.typography.label, color: theme.colors.brand },
    title: { ...theme.typography.screenTitle, color: theme.colors.text },
    updatedAt: { ...theme.typography.helper, color: theme.colors.textSecondary },
    formCard: { gap: theme.spacing.md },
    actionsCard: { gap: theme.spacing.md },
    sectionTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    sectionDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
    actionButton: { flex: 1 },
    dangerActions: { gap: theme.spacing.sm },
    confirmBlock: { gap: theme.spacing.sm },
    confirmText: { ...theme.typography.body, color: theme.colors.text },
    stateTitle: { ...theme.typography.screenTitle, color: theme.colors.text },
    stateDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
  });
