import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { FormField } from '../components/ui/FormField';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../design/tokens';
import { useThemedStyles } from '../design/useThemedStyles';
import type { Theme } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { normalizeNoteLabels } from '../features/notes/noteLabels';
import { NotesStackParamList } from '../navigation/navigationTypes';
import { NoteLabelsField } from '../components/notes/NoteLabels';

type NoteEditorScreenProps = {
  route?: { params?: NotesStackParamList['NoteEditor'] };
  navigation?: { goBack: () => void };
};

export function NoteEditorScreen({ route, navigation }: NoteEditorScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { notes, uiState, updateNote } = useNotes();
  const noteId = route?.params?.noteId ?? null;
  const note = useMemo(() => notes.find((item) => item.id === noteId) ?? null, [noteId, notes]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!note) {
      return;
    }

    setTitle(note.title);
    setBody(note.body);
    setLabels(note.labels);
    setError(null);
  }, [note]);

  async function handleSave(): Promise<void> {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError('Note body is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!note) return;
      await updateNote(note.id, {
        title: title.trim(),
        body: trimmedBody,
        labels: normalizeNoteLabels(labels),
      });
      navigation?.goBack();
    } catch {
      setError('Failed to save note changes.');
    } finally {
      setSaving(false);
    }
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
        <NoteLabelsField labels={labels} onChange={setLabels} />
        <AppButton
          label="Save Changes"
          accessibilityLabel="Save note changes"
          onPress={() => void handleSave()}
          loading={saving}
          loadingLabel="Saving..."
        />
      </View>
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
    stateTitle: { ...theme.typography.screenTitle, color: theme.colors.text },
    stateDescription: { ...theme.typography.body, color: theme.colors.textSecondary },
  });
