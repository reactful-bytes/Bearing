import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '../design/useThemedStyles';
import { AddNoteModal } from '../components/notes/AddNoteModal';
import { NoteDetailModal } from '../components/notes/NoteDetailModal';
import { NoteLabelChips } from '../components/notes/NoteLabels';
import { NoteFilterModal } from '../components/notes/NoteViewSheets';
import { AppIcon } from '../components/ui/AppIcon';
import { AppCard } from '../components/ui/AppCard';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { FilterSortToolbar } from '../components/ui/FilterSortToolbar';
import { SortOptionsModal } from '../components/ui/SortOptionsModal';
import { EmptyState } from '../components/ui/EmptyState';
import { RecoveryCard } from '../components/ui/RecoveryCard';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { RowContextMenu } from '../components/ui/RowContextMenu';
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pendingNoteAction, setPendingNoteAction] = useState<{
    note: NoteRecord;
    action: 'archive' | 'delete';
  } | null>(null);
  const [noteActionWorking, setNoteActionWorking] = useState(false);
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
    setEditingNoteId(null);
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
    setEditingNoteId((current) => (current === noteId ? null : current));
  }

  async function handleDeleteNote(noteId: string): Promise<void> {
    await deleteNote(noteId);
    setSelectedNoteId((current) => (current === noteId ? null : current));
    setEditingNoteId((current) => (current === noteId ? null : current));
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
    setEditingNoteId((current) => (current === noteId ? null : current));
  }

  async function handleRestoreNote(note: NoteRecord): Promise<void> {
    try {
      await updateNote(note.id, {
        title: note.title,
        body: note.body,
        labels: note.labels,
        pinned: note.pinned,
        archived: false,
      });
    } catch {
      Alert.alert('Unable to restore note', 'Please try again.');
    }
  }

  async function handleToggleNotePin(note: NoteRecord): Promise<void> {
    try {
      await pinNote(note.id, !note.pinned);
    } catch {
      Alert.alert('Unable to update note', 'Please try again.');
    }
  }

  async function handleConfirmNoteAction(): Promise<void> {
    if (!pendingNoteAction || noteActionWorking) return;
    setNoteActionWorking(true);
    try {
      if (pendingNoteAction.action === 'archive') {
        await handleArchiveNote(pendingNoteAction.note.id);
      } else {
        await handleDeleteNote(pendingNoteAction.note.id);
      }
      setPendingNoteAction(null);
    } catch {
      Alert.alert(
        pendingNoteAction.action === 'archive' ? 'Unable to archive note' : 'Unable to delete note',
        'Please try again.',
      );
    } finally {
      setNoteActionWorking(false);
    }
  }

  function openNoteView(): void {
    setFiltersVisible(true);
  }

  function openNoteSort(): void {
    setSortVisible(true);
  }

  function renderNoteCard(note: NoteRecord) {
    return (
      <View key={note.id} style={styles.noteRowContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open note ${note.title}`}
          onPress={() => openNote(note.id)}
          style={({ pressed }) => [styles.noteRow, pressed ? styles.noteCardPressed : null]}
        >
          <View testID={`note-icon-frame-${note.id}`} style={styles.noteIconFrame}>
            <AppIcon
              name="note"
              size={18}
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
        <View testID={`note-row-menu-anchor-${note.id}`} style={styles.noteMenuPosition}>
          <RowContextMenu
            accessibilityLabel={`Note actions for ${note.title}`}
            menuAccessibilityLabel={`Note actions menu for ${note.title}`}
            items={[
              {
                label: 'Edit',
                accessibilityLabel: `Edit note ${note.title}`,
                icon: 'edit',
                onPress: () => {
                  if (navigation?.navigate) {
                    navigation.navigate('NoteEditor', { noteId: note.id });
                  } else {
                    setSelectedNoteId(note.id);
                    setEditingNoteId(note.id);
                  }
                },
              },
              {
                label: note.pinned ? 'Unpin' : 'Pin',
                accessibilityLabel: note.pinned
                  ? `Unpin note ${note.title}`
                  : `Pin note ${note.title}`,
                icon: note.pinned ? 'pinned' : 'pin',
                onPress: () => void handleToggleNotePin(note),
              },
              {
                label: note.archived ? 'Restore' : 'Archive',
                accessibilityLabel: note.archived
                  ? `Restore note ${note.title}`
                  : `Archive note ${note.title}`,
                icon: note.archived ? 'refresh' : 'archive',
                onPress: () => {
                  if (note.archived) void handleRestoreNote(note);
                  else setPendingNoteAction({ note, action: 'archive' });
                },
              },
              {
                label: 'Delete',
                accessibilityLabel: `Delete note ${note.title}`,
                icon: 'delete',
                tone: 'danger',
                onPress: () => setPendingNoteAction({ note, action: 'delete' }),
              },
            ]}
          />
        </View>
      </View>
    );
  }

  function renderNoteRows(rows: readonly NoteRecord[]) {
    if (rows.length === 0) return null;
    return (
      <View testID="note-rows" style={styles.noteRows}>
        {rows.map(renderNoteCard)}
      </View>
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
        <View testID="note-search-field" style={styles.searchField}>
          <AppIcon name="search" size={18} color={styles.searchIcon.color} decorative />
          <TextInput
            accessibilityLabel="Search notes"
            autoCapitalize="none"
            onChangeText={setSearchQuery}
            placeholder="Search notes"
            placeholderTextColor={styles.searchPlaceholder.color}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear note search"
              onPress={() => setSearchQuery('')}
              style={styles.clearSearch}
            >
              <AppIcon name="close" size={16} color={styles.searchIcon.color} decorative />
            </Pressable>
          ) : null}
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
              renderNoteRows(visibleNotes)
            ) : (
              <>
                {renderNoteRows(pinnedNotes)}
                {recentNotes.length > 0 ? (
                  <Text accessibilityRole="header" style={styles.sectionLabel}>
                    Recent
                  </Text>
                ) : null}
                {renderNoteRows(recentNotes)}
                {allNotes.length > 0 ? (
                  <Text accessibilityRole="header" style={styles.sectionLabel}>
                    All notes
                  </Text>
                ) : null}
                {renderNoteRows(allNotes)}
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
        initialEditMode={editingNoteId === selectedNoteId}
        locale={profile?.locale}
        onClose={() => {
          setSelectedNoteId(null);
          setEditingNoteId(null);
        }}
        onSave={handleUpdateNote}
        onPin={pinNote}
        onArchive={handleArchiveNote}
        onDelete={handleDeleteNote}
      />
      <ConfirmationModal
        visible={pendingNoteAction !== null}
        title={pendingNoteAction?.action === 'archive' ? 'Archive note?' : 'Delete note?'}
        message={
          pendingNoteAction?.action === 'archive'
            ? 'This note will be removed from your active Notes list.'
            : 'Delete this note permanently?'
        }
        confirmLabel={pendingNoteAction?.action === 'archive' ? 'Archive' : 'Delete'}
        confirmVariant="danger"
        confirmAccessibilityLabel={
          pendingNoteAction?.action === 'archive' ? 'Confirm note archive' : 'Confirm note delete'
        }
        icon="delete"
        iconTone="danger"
        loading={noteActionWorking}
        onCancel={() => setPendingNoteAction(null)}
        onConfirm={() => void handleConfirmNoteAction()}
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
      minHeight: 56,
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    noteRowContainer: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    noteMenuPosition: { alignSelf: 'center', flexShrink: 0 },
    noteRows: { gap: spacing.xs },
    noteIconFrame: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceBrand,
    },
    noteIcon: { color: theme.colors.brand },
    noteCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
    noteMetadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    noteMetadataIcon: { color: theme.colors.textSecondary },
    noteMetadataText: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
    searchField: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      paddingLeft: spacing.md,
    },
    searchIcon: { color: theme.colors.textSecondary },
    searchPlaceholder: { color: theme.colors.textSecondary },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      ...typography.helper,
      color: theme.colors.text,
    },
    clearSearch: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
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
