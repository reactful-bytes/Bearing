import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddNoteModal } from '../components/notes/AddNoteModal';
import { NoteDetailModal } from '../components/notes/NoteDetailModal';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { AppIcon } from '../components/ui/AppIcon';
import { AppCard } from '../components/ui/AppCard';
import { BearingHeader } from '../components/ui/BearingHeader';
import { IconButton } from '../components/ui/IconButton';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { layout, radii, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { CreateNoteInput, NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { DEFAULT_TIME_FORMAT, TimeFormat, timeFormatOptions } from '../features/profile/timeFormat';
import { NotesStackParamList } from '../navigation/navigationTypes';

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

type NotesScreenProps = {
  route?: { params?: NotesStackParamList['NotesHome'] };
  navigation?: {
    setParams: (params: NotesStackParamList['NotesHome']) => void;
    navigate?: (screen: 'NoteEditor', params?: NotesStackParamList['NoteEditor']) => void;
    getParent?: () => { navigate?: (screen: string) => void } | undefined;
  };
};

const RECENT_NOTE_LIMIT = 3;

export function NotesScreen({ route, navigation }: NotesScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const { notes, uiState, createNote, updateNote, deleteNote, retry } = useNotes();
  const { profile } = useUserProfile();
  const timeFormat = profile?.timeFormat ?? DEFAULT_TIME_FORMAT;
  const [addNoteVisible, setAddNoteVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    if (!route?.params?.createNote) {
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate('NoteEditor');
    } else {
      setAddNoteVisible(true);
    }
    navigation?.setParams({ createNote: undefined });
  }, [navigation, route?.params?.createNote]);

  const selectedNote = selectedNoteId
    ? (notes.find((note) => note.id === selectedNoteId) ?? null)
    : null;
  const activeNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const visibleNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return activeNotes.filter((note) => {
      if (showPinnedOnly && !note.pinned) return false;
      if (!normalizedQuery) return true;
      return `${note.title} ${note.body}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeNotes, searchQuery, showPinnedOnly]);
  const pinnedNotes = visibleNotes.filter((note) => note.pinned);
  const recentNotes = visibleNotes.filter((note) => !note.pinned).slice(0, RECENT_NOTE_LIMIT);
  const recentNoteIds = new Set(recentNotes.map((note) => note.id));
  const allNotes = visibleNotes.filter((note) => !note.pinned && !recentNoteIds.has(note.id));

  function openNoteEditor(noteId?: string): void {
    if (navigation?.navigate) {
      navigation.navigate('NoteEditor', noteId ? { noteId } : undefined);
      return;
    }

    if (noteId) setSelectedNoteId(noteId);
    else setAddNoteVisible(true);
  }

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
      <BearingHeader
        leadingAccessibilityLabel="Open navigation"
        onPressLeading={() => navigation?.getParent?.()?.navigate?.('Plan')}
        trailingAccessibilityLabel="Open profile"
        onPressTrailing={() => navigation?.getParent?.()?.navigate?.('Profile')}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <AppIcon name="search" size={18} color={styles.searchIcon.color} decorative />
            <TextInput
              accessibilityLabel="Search notes"
              onChangeText={setSearchQuery}
              placeholder="Search notes"
              placeholderTextColor={styles.searchPlaceholder.color}
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>
          <IconButton
            name="filter"
            accessibilityLabel={showPinnedOnly ? 'Show all notes' : 'Show pinned notes'}
            onPress={() => setShowPinnedOnly((current) => !current)}
            style={showPinnedOnly ? styles.filterActive : null}
          />
        </View>

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

        {uiState === 'ready' ? (
          <>
            {pinnedNotes.length > 0 ? (
              <Text accessibilityRole="header" style={styles.sectionLabel}>
                Pinned
              </Text>
            ) : null}
            {pinnedNotes.map((note) => (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={`Open note ${note.title}`}
                onPress={() => openNoteEditor(note.id)}
                style={({ pressed }) => [pressed ? styles.noteCardPressed : null]}
              >
                <AppCard style={[styles.noteCard, styles.pinnedNoteCard, styles.ideaNote]}>
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
            ))}
            {recentNotes.length > 0 ? (
              <Text accessibilityRole="header" style={styles.sectionLabel}>
                Recent
              </Text>
            ) : null}
            {recentNotes.map((note) => (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={`Open note ${note.title}`}
                onPress={() => openNoteEditor(note.id)}
                style={({ pressed }) => [pressed ? styles.noteCardPressed : null]}
              >
                <AppCard style={[styles.noteCard, styles.recentNoteCard, styles.ideaNote]}>
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
            ))}
            {allNotes.length > 0 ? (
              <Text accessibilityRole="header" style={styles.sectionLabel}>
                All notes
              </Text>
            ) : null}
            {allNotes.map((note) => (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={`Open note ${note.title}`}
                onPress={() => openNoteEditor(note.id)}
                style={({ pressed }) => [pressed ? styles.noteCardPressed : null]}
              >
                <AppCard style={[styles.noteCard, styles.allNoteCard, styles.manualNote]}>
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
            ))}
            {visibleNotes.length === 0 ? (
              <AppCard>
                <Text style={styles.stateTitle}>No matching notes.</Text>
                <Text style={styles.stateDescription}>Try a different search or filter.</Text>
              </AppCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.fabContainer}>
        <FloatingActionButton
          accessibilityLabel="New Note"
          icon="add"
          onPress={() => openNoteEditor()}
          size="standard"
          style={styles.fab}
        />
      </View>

      <AddNoteModal
        visible={addNoteVisible && !navigation?.navigate}
        onClose={() => setAddNoteVisible(false)}
        onSave={handleCreateNote}
      />

      <NoteDetailModal
        visible={selectedNote !== null && !navigation?.navigate}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: layout.pagePaddingHorizontal,
      paddingVertical: layout.pagePaddingVertical,
      gap: spacing.lg,
      paddingBottom: 120,
    },
    stateTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    stateDescription: {
      ...typography.body,
      color: theme.colors.textPrimary,
      marginTop: spacing.sm,
    },
    noteCard: {
      gap: spacing.sm,
      borderLeftWidth: 2,
      borderRadius: radii.md,
    },
    ideaNote: { borderLeftColor: theme.colors.warning },
    manualNote: { borderLeftColor: theme.colors.brand },
    pinnedNoteCard: {
      backgroundColor: theme.colors.surfaceBrand,
      borderColor: theme.colors.brand,
    },
    recentNoteCard: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    allNoteCard: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchField: {
      flex: 1,
      minHeight: layout.minimumTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.brand,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    searchIcon: { color: theme.colors.textSecondary },
    searchPlaceholder: { color: theme.colors.textMuted },
    searchInput: {
      flex: 1,
      minHeight: layout.minimumTouchTarget,
      ...typography.helper,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    filterActive: { backgroundColor: theme.colors.surfaceBrand },
    sectionLabel: {
      ...typography.label,
      color: theme.colors.brand,
      marginTop: spacing.sm,
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
      color: theme.colors.textSecondary,
    },
    noteDate: {
      ...typography.helper,
      color: theme.colors.textSecondary,
    },
    noteTitle: {
      ...typography.button,
      color: theme.colors.text,
    },
    noteBody: {
      ...typography.body,
      color: theme.colors.textPrimary,
    },
    fabContainer: {
      position: 'absolute',
      right: layout.pagePaddingHorizontal,
      bottom: layout.pagePaddingVertical,
    },
    fab: { alignSelf: 'flex-end' },
  });
