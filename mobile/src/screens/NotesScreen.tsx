import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddNoteModal } from '../components/notes/AddNoteModal';
import { NoteDetailModal } from '../components/notes/NoteDetailModal';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { AppCard } from '../components/ui/AppCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { colors, layout, radii, spacing, typography } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { CreateNoteInput, NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';

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

export function NotesScreen() {
  const { notes, uiState, createNote, updateNote, deleteNote, retry } = useNotes();
  const { profile } = useUserProfile();
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const [addNoteVisible, setAddNoteVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const selectedNote = selectedNoteId
    ? (notes.find((note) => note.id === selectedNoteId) ?? null)
    : null;

  async function handleCreateNote(input: CreateNoteInput): Promise<void> {
    await createNote(input);
  }

  async function handleUpdateNote(noteId: string, fields: UpdateNoteInput): Promise<void> {
    await updateNote(noteId, fields);
  }

  async function handleDeleteNote(noteId: string): Promise<void> {
    await deleteNote(noteId);
    setSelectedNoteId((current) => (current === noteId ? null : current));
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ScreenHeader
          eyebrow="Notes"
          title="Notes"
          description="Capture quick thoughts, Idea Dump entries, and longer-form notes."
        />

        {uiState === 'loading' ? (
          <AppCard>
            <Text style={styles.stateTitle}>Loading notes...</Text>
            <Text style={styles.stateDescription}>Fetching your latest captured thoughts.</Text>
          </AppCard>
        ) : null}

        {uiState === 'error' ? (
          <RecoveryCard
            title="Unable to load notes."
            description="Check your connection, then retry."
            onRetry={retry}
          />
        ) : null}

        {uiState === 'empty' ? (
          <AppCard>
            <Text style={styles.stateTitle}>No notes yet.</Text>
            <Text style={styles.stateDescription}>
              Create one here or save an Idea Dump from Focus Mode.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready'
          ? notes.map((note) => (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={`Open note ${note.title}`}
                onPress={() => setSelectedNoteId(note.id)}
                style={({ pressed }) => [pressed ? styles.noteCardPressed : null]}
              >
                <AppCard style={styles.noteCard}>
                  <View style={styles.noteMetaRow}>
                    <Text style={styles.noteSource}>{noteSourceLabel(note)}</Text>
                    <Text style={styles.noteDate}>
                      {formatDateTime(note.updatedAt, timeFormat, profile?.locale)}
                    </Text>
                  </View>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteBody}>{note.body}</Text>
                </AppCard>
              </Pressable>
            ))
          : null}
      </ScrollView>

      <View style={styles.fabContainer}>
        <FloatingActionButton
          label="New Note"
          onPress={() => setAddNoteVisible(true)}
          style={styles.smallFab}
        />
      </View>

      <AddNoteModal
        visible={addNoteVisible}
        onClose={() => setAddNoteVisible(false)}
        onSave={handleCreateNote}
      />

      <NoteDetailModal
        visible={selectedNote !== null}
        note={selectedNote}
        locale={profile?.locale}
        timeFormat={timeFormat}
        onClose={() => setSelectedNoteId(null)}
        onSave={handleUpdateNote}
        onDelete={handleDeleteNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingVertical: layout.pagePaddingVertical,
    gap: spacing.xl,
    paddingBottom: 120,
  },
  stateTitle: {
    ...typography.button,
    color: colors.text,
  },
  stateDescription: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  noteCard: {
    gap: spacing.md,
  },
  noteCardPressed: {
    opacity: 0.92,
  },
  noteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  noteSource: {
    ...typography.label,
    color: colors.textSecondary,
  },
  noteDate: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  noteTitle: {
    ...typography.button,
    color: colors.text,
  },
  noteBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  fabContainer: {
    position: 'absolute',
    right: layout.pagePaddingHorizontal,
    bottom: layout.pagePaddingVertical,
  },
  smallFab: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
});
