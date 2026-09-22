import { useEffect, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { FormField } from '../components/ui/FormField';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../design/tokens';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { NotesStackParamList } from '../navigation/navigationTypes';

type NoteEditorScreenProps = {
  route?: { params?: NotesStackParamList['NoteEditor'] };
  navigation?: { goBack: () => void };
};

export function NoteEditorScreen({ route, navigation }: NoteEditorScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NavigationProp<NotesStackParamList>>();
  const { notes, uiState, updateNote, pinNote, archiveNote, deleteNote } = useNotes();
  const noteId = route?.params?.noteId ?? null;
  const note = useMemo(() => notes.find((item) => item.id === noteId) ?? null, [noteId, notes]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!note) {
      return;
    }

    setTitle(note.title);
    setBody(note.body);
    setPinned(note.pinned);
    setError(null);
    setConfirmingDelete(false);
  }, [note]);

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
      if (!note) return;
      await updateNote(note.id, { title: title.trim(), body: trimmedBody, pinned });
      navigation?.goBack();
    } catch {
      setError('Failed to save note changes.');
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

  async function handleTogglePinned(): Promise<void> {
    if (!note) {
      setPinned((current) => !current);
      return;
    }

    const nextPinned = !note.pinned;
    setPinned(nextPinned);
    setPinning(true);
    setError(null);

    try {
      await pinNote(note.id, nextPinned);
    } catch {
      setPinned(note.pinned);
      setError('Failed to update note pin.');
    } finally {
      setPinning(false);
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

  if (noteId && uiState === 'loading' && !note) {
    return (
      <AppScreen
        mode="scroll"
        testID="note-editor-loading"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Edit Note"
          onPressBack={() => navigation?.goBack?.()}
          backAccessibilityLabel="Back to Notes"
        />
        <Text style={styles.stateTitle}>Loading note...</Text>
      </AppScreen>
    );
  }

  if (noteId && !note) {
    return (
      <AppScreen
        mode="scroll"
        testID="note-editor-missing"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Edit Note"
          onPressBack={() => navigation?.goBack?.()}
          backAccessibilityLabel="Back to Notes"
        />
        <Text style={styles.stateTitle}>Note unavailable.</Text>
        <Text style={styles.stateDescription}>This note may have been deleted or archived.</Text>
        <AppButton label="Back to Notes" onPress={navigation?.goBack} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      mode="scroll"
      testID="note-editor-screen"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: spacing.xl + insets.bottom },
      ]}
    >
      <ScreenHeader
        title="Edit Note"
        onPressBack={() => navigation?.goBack?.()}
        backAccessibilityLabel="Back to Notes"
      />

      <View style={styles.form}>
        <FormField
          label="Title"
          accessibilityLabel="Note title"
          placeholder="Optional title"
          value={title}
          onChangeText={setTitle}
          inputStyle={styles.titleInput}
        />
        <FormField
          label="Content"
          accessibilityLabel="Note body"
          placeholder="Write your note..."
          value={body}
          onChangeText={setBody}
          multiline
          error={error}
          inputStyle={styles.bodyInput}
        />
        <AppButton
          label={pinned ? 'Unpin note' : 'Pin note'}
          variant="secondary"
          accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
          onPress={handleTogglePinned}
          loading={pinning}
          loadingLabel="Updating..."
          style={pinned ? styles.pinToggleActive : null}
        />
        <AppButton
          label="Save Changes"
          accessibilityLabel="Save note changes"
          onPress={() => void handleSave()}
          loading={saving}
          loadingLabel="Saving..."
        />
      </View>

      {note ? (
        <AppCard style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Use this note</Text>
          <Text style={styles.sectionDescription}>
            Start a draft from this context, then edit it before committing.
          </Text>
          <View style={styles.actionRow}>
            <AppButton
              label="Create Task"
              variant="secondary"
              onPress={() => openConversion('CreateTaskFromNote')}
              style={[styles.actionButton, styles.createTaskAccent]}
            />
            <AppButton
              label="Create Goal"
              variant="secondary"
              onPress={() => openConversion('CreateGoalFromNote')}
              style={[styles.actionButton, styles.createGoalAccent]}
            />
          </View>
          <AppButton
            label="Create Event"
            variant="secondary"
            onPress={() => openConversion('CreateEventFromNote')}
            style={styles.createEventAccent}
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
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    form: { gap: theme.spacing.md, paddingTop: theme.spacing.sm },
    titleInput: {
      minHeight: 48,
      borderRadius: theme.radii.md,
    },
    bodyInput: {
      minHeight: 160,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
    },
    pinToggleActive: {
      backgroundColor: theme.colors.surfaceBrand,
      borderColor: theme.colors.brand,
    },
    actionsCard: { gap: theme.spacing.md },
    sectionTitle: { ...theme.typography.cardTitle, color: theme.colors.text },
    sectionDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
    actionButton: { flex: 1 },
    createTaskAccent: { borderWidth: 1, borderColor: theme.colors.brand },
    createGoalAccent: { borderWidth: 1, borderColor: theme.colors.success },
    createEventAccent: { borderColor: theme.colors.purple },
    dangerActions: { gap: theme.spacing.sm },
    confirmBlock: { gap: theme.spacing.sm },
    confirmText: { ...theme.typography.body, color: theme.colors.text },
    stateTitle: { ...theme.typography.screenTitle, color: theme.colors.text },
    stateDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
  });
