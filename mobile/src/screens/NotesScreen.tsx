import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddNoteModal } from '../components/notes/AddNoteModal';
import { NoteDetailModal } from '../components/notes/NoteDetailModal';
import { NoteLabelChips } from '../components/notes/NoteLabels';
import { NoteFilterModal } from '../components/notes/NoteViewSheets';
import { AppIcon } from '../components/ui/AppIcon';
import { AppCard } from '../components/ui/AppCard';
import { IconButton } from '../components/ui/IconButton';
import { FilterSortToolbar } from '../components/ui/FilterSortToolbar';
import { SortOptionsModal } from '../components/ui/SortOptionsModal';
import { EmptyState } from '../components/ui/EmptyState';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { layout, radii, spacing, typography } from '../design/tokens';
import type { Theme } from '../design/tokens';
import { useNotes } from '../features/notes/useNotes';
import { normalizeNoteLabels } from '../features/notes/noteLabels';
import { sortNotesForView } from '../features/notes/noteSorting';
import { CreateNoteInput, NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useUserProfile } from '../features/profile/useUserProfile';
import { NotesStackParamList } from '../navigation/navigationTypes';
import { DEFAULT_NOTE_VIEW, NOTE_SORT_OPTIONS } from './noteViewOptions';

type NotesScreenProps = {
  route?: { params?: NotesStackParamList['NotesHome'] };
  navigation?: {
    goBack?: () => void;
    setParams: (params: NotesStackParamList['NotesHome']) => void;
    navigate?: (
      screen: 'NoteDetail' | 'NoteEditor' | 'CreateNote',
      params?:
        | NotesStackParamList['NoteDetail']
        | NotesStackParamList['NoteEditor']
        | NotesStackParamList['CreateNote'],
    ) => void;
    getParent?: () => { navigate?: (screen: string) => void } | undefined;
  };
};

const RECENT_NOTE_LIMIT = 3;

function formatDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NotesScreen({ route, navigation }: NotesScreenProps = {}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { notes, uiState, createNote, updateNote, pinNote, archiveNote, deleteNote, retry } =
    useNotes();
  const { profile } = useUserProfile();
  const [addNoteVisible, setAddNoteVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteView, setNoteView] = useState({
    ...DEFAULT_NOTE_VIEW,
    selectedLabels: [] as string[],
  });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);

  useEffect(() => {
    if (!route?.params?.createNote) {
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate('CreateNote');
    } else {
      setAddNoteVisible(true);
    }
    navigation?.setParams({ createNote: undefined });
  }, [navigation, route?.params?.createNote]);

  useEffect(() => {
    if (!route?.params?.resetView) return;

    setNoteView({ ...DEFAULT_NOTE_VIEW, selectedLabels: [] });
    setSearchQuery('');
    navigation?.setParams({ resetView: undefined });
  }, [navigation, route?.params?.resetView]);

  const selectedNote = selectedNoteId
    ? (notes.find((note) => note.id === selectedNoteId) ?? null)
    : null;
  const availableLabels = useMemo(
    () =>
      normalizeNoteLabels(notes.flatMap((note) => note.labels)).sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' }),
      ),
    [notes],
  );
  const selectedSort = NOTE_SORT_OPTIONS.find((option) => option.value === noteView.sortBy)!;
  const noteFilterSummary = [
    noteView.archivedOnly ? 'Archived' : 'Active',
    noteView.pinnedOnly ? 'Pinned' : null,
    noteView.selectedLabels.length === 0
      ? null
      : noteView.selectedLabels.length === 1
        ? noteView.selectedLabels[0]
        : `${noteView.selectedLabels.length} labels`,
  ]
    .filter(Boolean)
    .join(' · ');
  const visibleNotes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const selectedLabels = new Set(
      noteView.selectedLabels.map((label) => label.toLocaleLowerCase()),
    );
    return sortNotesForView(notes, noteView.sortBy).filter((note) => {
      if (note.archived !== noteView.archivedOnly) return false;
      if (noteView.pinnedOnly && !note.pinned) return false;
      if (
        selectedLabels.size > 0 &&
        !note.labels.some((label) => selectedLabels.has(label.toLocaleLowerCase()))
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return `${note.title} ${note.body} ${note.labels.join(' ')}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    notes,
    noteView.archivedOnly,
    noteView.pinnedOnly,
    noteView.selectedLabels,
    noteView.sortBy,
    searchQuery,
  ]);
  const pinnedNotes = visibleNotes.filter((note) => note.pinned);
  const recentNotes = visibleNotes.filter((note) => !note.pinned).slice(0, RECENT_NOTE_LIMIT);
  const recentNoteIds = new Set(recentNotes.map((note) => note.id));
  const allNotes = visibleNotes.filter((note) => !note.pinned && !recentNoteIds.has(note.id));

  function openNote(noteId?: string): void {
    if (navigation?.navigate) {
      navigation.navigate(noteId ? 'NoteDetail' : 'CreateNote', noteId ? { noteId } : undefined);
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

  async function handleArchiveNote(noteId: string): Promise<void> {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    await archiveNote(noteId, {
      title: note.title,
      body: note.body,
      labels: note.labels,
      pinned: note.pinned,
    });
    setSelectedNoteId((current) => (current === noteId ? null : current));
  }

  function openNoteView(): void {
    setFiltersVisible(true);
  }

  function openNoteSort(): void {
    setSortVisible(true);
  }

  function renderNoteCard(note: NoteRecord) {
    return (
      <Pressable
        key={note.id}
        accessibilityRole="button"
        accessibilityLabel={`Open note ${note.title}`}
        onPress={() => openNote(note.id)}
        style={({ pressed }) => [styles.noteRow, pressed ? styles.noteCardPressed : null]}
      >
        <View style={styles.noteIconSlot}>
          <AppIcon
            name="note"
            size={20}
            color={styles.noteIcon.color}
            decorative
            testID={`note-icon-${note.id}`}
          />
        </View>
        <View style={styles.noteCopy}>
          <Text numberOfLines={1} style={styles.noteTitle}>
            {note.title}
          </Text>
          <Text numberOfLines={1} style={styles.noteBody}>
            {note.body}
          </Text>
          <View style={styles.noteMetadata}>
            <AppIcon
              name="calendar"
              size={14}
              color={styles.noteMetadataIcon.color}
              decorative
              testID={`note-date-icon-${note.id}`}
            />
            <Text numberOfLines={2} style={styles.noteMetadataText}>
              Updated {formatDate(note.updatedAt, profile?.locale)} · Created{' '}
              {formatDate(note.createdAt, profile?.locale)}
            </Text>
          </View>
          <NoteLabelChips labels={note.labels} />
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top },
          { paddingBottom: spacing.xl + insets.bottom },
        ]}
      >
        <ScreenHeader
          title="Notes"
          onPressBack={() => {
            if (navigation?.goBack) {
              navigation.goBack();
              return;
            }

            navigation?.getParent?.()?.navigate?.('Plan');
          }}
        />
        <View style={styles.searchRow}>
          <View
            testID="note-search-field"
            style={[styles.searchField, searchQuery ? styles.searchFieldWithClear : null]}
          >
            <AppIcon name="search" size={18} color={styles.searchIcon.color} decorative />
            <TextInput
              accessibilityLabel="Search notes"
              onChangeText={setSearchQuery}
              placeholder="Search notes"
              placeholderTextColor={styles.searchPlaceholder.color}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 ? (
              <IconButton
                name="close"
                size={18}
                color={styles.searchIcon.color}
                accessibilityLabel="Clear note search"
                onPress={() => setSearchQuery('')}
              />
            ) : null}
          </View>
        </View>
        <FilterSortToolbar
          testID="note-filter-sort-toolbar"
          filterSummary={noteFilterSummary}
          sortSummary={selectedSort.summary}
          filterAccessibilityLabel="Open note filters"
          sortAccessibilityLabel="Open note sort options"
          onPressFilter={openNoteView}
          onPressSort={openNoteSort}
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
              Create a note here or capture a thought during Focus Mode.
            </Text>
          </AppCard>
        ) : null}

        {uiState === 'ready' ? (
          <>
            {noteView.archivedOnly ? (
              visibleNotes.length > 0 ? (
                <Text accessibilityRole="header" style={styles.sectionLabel}>
                  Archived
                </Text>
              ) : null
            ) : pinnedNotes.length > 0 ? (
              <Text accessibilityRole="header" style={styles.sectionLabel}>
                Pinned
              </Text>
            ) : null}
            {noteView.archivedOnly ? (
              visibleNotes.map(renderNoteCard)
            ) : (
              <>
                {pinnedNotes.map(renderNoteCard)}
                {recentNotes.length > 0 ? (
                  <Text accessibilityRole="header" style={styles.sectionLabel}>
                    Recent
                  </Text>
                ) : null}
                {recentNotes.map(renderNoteCard)}
                {allNotes.length > 0 ? (
                  <Text accessibilityRole="header" style={styles.sectionLabel}>
                    All notes
                  </Text>
                ) : null}
                {allNotes.map(renderNoteCard)}
              </>
            )}
            {visibleNotes.length === 0 ? (
              <EmptyState
                title={
                  noteView.archivedOnly
                    ? 'No archived notes.'
                    : noteView.pinnedOnly
                      ? 'No matching pinned notes.'
                      : 'No matching notes.'
                }
                description={
                  noteView.archivedOnly
                    ? 'Archived notes will appear here.'
                    : noteView.pinnedOnly
                      ? 'Adjust your filters or search to see other notes.'
                      : 'Try different filters or search terms.'
                }
                presentation="compact"
                style={styles.noMatchingNotes}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <AddNoteModal
        visible={addNoteVisible && !navigation?.navigate}
        onClose={() => setAddNoteVisible(false)}
        onSave={handleCreateNote}
      />

      <NoteDetailModal
        visible={selectedNote !== null && !navigation?.navigate}
        note={selectedNote}
        locale={profile?.locale}
        onClose={() => setSelectedNoteId(null)}
        onSave={handleUpdateNote}
        onPin={pinNote}
        onArchive={handleArchiveNote}
        onDelete={handleDeleteNote}
      />
      <NoteFilterModal
        visible={filtersVisible}
        draft={{ ...noteView, noteSearch: searchQuery }}
        labels={availableLabels}
        onClose={() => setFiltersVisible(false)}
        onApply={(nextView) => {
          setNoteView((current) => ({
            ...current,
            archivedOnly: nextView.archivedOnly,
            pinnedOnly: nextView.pinnedOnly,
            selectedLabels: [...nextView.selectedLabels],
          }));
          setFiltersVisible(false);
        }}
      />
      <SortOptionsModal
        visible={sortVisible}
        title="Sort notes"
        accessibilityLabelPrefix="Sort notes by"
        selectedValue={noteView.sortBy}
        options={NOTE_SORT_OPTIONS}
        onClose={() => setSortVisible(false)}
        onApply={(sortBy) => {
          setNoteView((current) => ({ ...current, sortBy }));
          setSortVisible(false);
        }}
      />
    </SafeAreaView>
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
    noMatchingNotes: { alignSelf: 'stretch', alignItems: 'center' },
    noteRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    noteIconSlot: {
      width: 36,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteIcon: { color: theme.colors.textSecondary },
    noteCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    noteMetadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    noteMetadataIcon: { color: theme.colors.textSecondary },
    noteMetadataText: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
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
    searchFieldWithClear: { paddingRight: 0 },
    searchIcon: { color: theme.colors.textSecondary },
    searchPlaceholder: { color: theme.colors.textMuted },
    searchInput: {
      flex: 1,
      minHeight: layout.minimumTouchTarget,
      ...typography.helper,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    viewControlsTrigger: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    viewControlsSummary: { ...typography.helper, color: theme.colors.textPrimary, flex: 1 },
    viewControlsIcon: { color: theme.colors.textSecondary },
    sectionLabel: {
      ...typography.label,
      color: theme.colors.brand,
      marginTop: spacing.sm,
    },
    noteCardPressed: {
      opacity: 0.92,
    },
    noteTitle: {
      ...typography.helper,
      color: theme.colors.text,
      fontWeight: '600',
    },
    noteBody: {
      ...typography.caption,
      color: theme.colors.textSecondary,
    },
  });
