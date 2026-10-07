import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { ScrollView, StyleSheet } from 'react-native';

import { AppIcon } from '../components/ui/AppIcon';
import { spacing } from '../design/tokens';
import { CreateNoteInput, NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useNotes } from '../features/notes/useNotes';
import { NotesScreen } from '../screens/NotesScreen';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({ profile: { locale: 'en-US', timeFormat: '12-hour' } })),
}));

jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(),
}));

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Captured thought',
    body: 'Keep this idea around for later.',
    labels: [],
    source: 'idea_dump',
    sourceEventId: 'event-1',
    sourceMilestoneId: null,
    processed: false,
    archived: false,
    createdAt: new Date(2026, 6, 20, 10, 0, 0),
    updatedAt: new Date(2026, 6, 20, 10, 0, 0),
    ...overrides,
    pinned: overrides.pinned ?? false,
  };
}

function makeUseNotesReturn(
  overrides: Partial<ReturnType<typeof useNotes>> = {},
): ReturnType<typeof useNotes> {
  return {
    notes: [],
    uiState: 'empty',
    createNote: async () => undefined,
    updateNote: async () => undefined,
    pinNote: async () => undefined,
    archiveNote: async () => undefined,
    deleteNote: async () => undefined,
    retry: jest.fn(),
    ...overrides,
  };
}

async function openNoteActions(): Promise<void> {
  fireEvent.press(screen.getByLabelText('More note actions'));
  await waitFor(() => {
    expect(screen.getByRole('menuitem', { name: 'Edit note' })).toBeTruthy();
  });
}

describe('NotesScreen', () => {
  it('retries after the notes subscription fails', () => {
    const retry = jest.fn();
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(makeUseNotesReturn({ uiState: 'error', retry }));

    render(<NotesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(makeUseNotesReturn());

    render(<NotesScreen />);

    expect(screen.getByText('No notes yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New Note' })).toBeNull();
  });

  it('renders saved notes with labels without treating origin as a category', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ labels: ['Focus'] }),
          makeNote({
            id: 'note-2',
            source: 'manual',
            title: 'Personal note',
            sourceEventId: null,
            labels: ['Personal'],
          }),
        ],
        uiState: 'ready',
      }),
    );

    render(<NotesScreen />);

    expect(StyleSheet.flatten(screen.getByTestId('note-search-field').props.style)).toMatchObject({
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      paddingLeft: spacing.md,
    });
    expect(screen.getByLabelText('Search notes').props).toMatchObject({
      autoCapitalize: 'none',
      returnKeyType: 'search',
    });
    expect(screen.getByText('Captured thought')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByLabelText('Open note Captured thought').props.style),
    ).toMatchObject({ minHeight: 56, paddingVertical: spacing.xs });
    expect(
      screen.getAllByTestId('note-rows').every(
        (rows) => StyleSheet.flatten(rows.props.style).gap === spacing.xs,
      ),
    ).toBe(true);
    expect(
      screen
        .getByLabelText('Open note Captured thought')
        .findAllByType(AppIcon)
        .map((icon) => icon.props.name),
    ).toEqual(['note', 'calendar']);
    expect(StyleSheet.flatten(screen.getByTestId('note-icon-frame-note-1').props.style)).toMatchObject({
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(screen.getByText('Personal note')).toBeTruthy();
    expect(screen.getByText('Focus')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getAllByText(/Updated .* · Created .*/)).toHaveLength(2);
    expect(
      StyleSheet.flatten(screen.getByLabelText('Open note Captured thought').props.style)
        .borderBottomWidth,
    ).toBeUndefined();
    expect(screen.queryByText('Idea Dump')).toBeNull();
    expect(screen.queryByText('Manual Note')).toBeNull();
  });

  it('clears search text and restores the unfiltered notes', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({ notes: [makeNote({ title: 'Captured thought' })], uiState: 'ready' }),
    );

    render(<NotesScreen />);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
    expect(screen.queryByLabelText('Clear note search')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('note-search-field').props.style).paddingRight,
    ).toBeUndefined();

    fireEvent.changeText(screen.getByLabelText('Search notes'), 'missing');
    expect(screen.getByText('No matching notes.')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('No matching notes.').props.style).fontSize).toBe(
      14,
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText('Clear note search').props.style),
    ).toMatchObject({ width: 44, height: 44 });
    fireEvent.press(screen.getByLabelText('Clear note search'));

    expect(screen.getByLabelText('Search notes').props.value).toBe('');
    expect(screen.getByText('Captured thought')).toBeTruthy();
    expect(screen.queryByLabelText('Clear note search')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('note-search-field').props.style).paddingRight,
    ).toBeUndefined();
  });

  it('applies pinned filtering from the filter sheet and can restore all notes', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({ notes: [makeNote({ title: 'Unpinned note' })], uiState: 'ready' }),
    );

    render(<NotesScreen />);
    fireEvent.press(screen.getByLabelText('Open note filters'));
    expect(screen.getByText('Unpinned note')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'All notes' }).props.accessibilityState.selected,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Pinned only' }));
    expect(screen.getByText('Unpinned note')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Apply note filters'));
    expect(screen.queryByText('Unpinned note')).toBeNull();
    expect(screen.getByText('No matching pinned notes.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open note filters'));
    fireEvent.press(screen.getByRole('button', { name: 'All notes' }));
    fireEvent.press(screen.getByLabelText('Apply note filters'));
    expect(screen.getByText('Unpinned note')).toBeTruthy();
  });

  it('keeps archived notes hidden and separates pinned, recent, and all notes', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ id: 'pinned', title: 'Pinned note', pinned: true }),
          makeNote({ id: 'recent', title: 'Recent note', updatedAt: new Date() }),
          makeNote({
            id: 'older',
            title: 'Older note',
            updatedAt: new Date(2020, 1, 1),
          }),
          makeNote({
            id: 'oldest',
            title: 'Oldest note',
            updatedAt: new Date(2019, 1, 1),
          }),
          makeNote({
            id: 'ancient',
            title: 'Ancient note',
            updatedAt: new Date(2018, 1, 1),
          }),
          makeNote({ id: 'archived', title: 'Archived note', archived: true }),
        ],
        uiState: 'ready',
      }),
    );

    render(<NotesScreen />);

    expect(screen.getByText('Pinned')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('All notes')).toBeTruthy();
    expect(screen.getByText('Pinned note')).toBeTruthy();
    expect(screen.getByText('Recent note')).toBeTruthy();
    expect(screen.getByText('Ancient note')).toBeTruthy();
    expect(screen.queryByText('Archived note')).toBeNull();
  });

  it('shows archived notes on the archived view and opens their details', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ id: 'active', title: 'Active note' }),
          makeNote({ id: 'archived', title: 'Archived note', archived: true }),
        ],
        uiState: 'ready',
      }),
    );
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };

    render(<NotesScreen navigation={navigation} />);
    fireEvent.press(screen.getByRole('button', { name: 'Open note filters' }));
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Archived' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply note filters' }));

    expect(screen.getByText('Archived note')).toBeTruthy();
    expect(screen.queryByText('Active note')).toBeNull();
    expect(screen.getByText('Filters: Archived')).toBeTruthy();
    expect(screen.getByText('Sort: Updated newest')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open note Archived note'));
    expect(navigation.navigate).toHaveBeenCalledWith('NoteDetail', { noteId: 'archived' });
  });

  it('returns to the active Notes view when resetView is requested', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ id: 'active', title: 'Active note' }),
          makeNote({ id: 'archived', title: 'Archived note', archived: true }),
        ],
        uiState: 'ready',
      }),
    );
    const setParams = jest.fn();
    const notesScreen = render(<NotesScreen navigation={{ setParams }} />);

    fireEvent.changeText(screen.getByLabelText('Search notes'), 'Archived');
    fireEvent.press(screen.getByRole('button', { name: 'Open note filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Archived' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply note filters' }));
    expect(screen.getByText('Archived note')).toBeTruthy();

    notesScreen.rerender(
      <NotesScreen route={{ params: { resetView: true } }} navigation={{ setParams }} />,
    );

    expect(screen.getByText('Active note')).toBeTruthy();
    expect(screen.queryByText('Archived note')).toBeNull();
    expect(screen.getByLabelText('Search notes').props.value).toBe('');
    expect(setParams).toHaveBeenCalledWith({ resetView: undefined });
  });

  it('restores an archived note from the fallback detail modal', async () => {
    const updateNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [makeNote({ title: 'Archived note', archived: true })],
        uiState: 'ready',
        updateNote,
      }),
    );

    render(<NotesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Open note filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Archived' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply note filters' }));

    fireEvent.press(screen.getByLabelText('Open note Archived note'));
    await openNoteActions();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Restore note' }));

    await waitFor(() =>
      expect(updateNote).toHaveBeenCalledWith('note-1', {
        title: 'Archived note',
        body: 'Keep this idea around for later.',
        labels: [],
        pinned: false,
        archived: false,
      }),
    );
  });

  it('filters by any selected label and search while showing the active view summary', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ id: 'focus', title: 'Focus note', labels: ['Focus'] }),
          makeNote({ id: 'home', title: 'Home note', labels: ['Home'] }),
          makeNote({ id: 'other', title: 'Other note', labels: ['Other'] }),
        ],
        uiState: 'ready',
      }),
    );

    render(<NotesScreen />);
    fireEvent.changeText(screen.getByLabelText('Search notes'), 'note');
    fireEvent.press(screen.getByRole('button', { name: 'Open note filters' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Filter notes by Focus' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Filter notes by Home' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply note filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open note sort options' }));
    expect(screen.getByTestId('app-modal-drag-handle')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Sort notes by Title A to Z' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply sort notes' }));

    expect(screen.getByText('Focus note')).toBeTruthy();
    expect(screen.getByText('Home note')).toBeTruthy();
    expect(screen.queryByText('Other note')).toBeNull();
    expect(
      screen.getByText('Filters: Active · 2 labels'),
    ).toBeTruthy();
    expect(screen.getByText('Sort: Title A-Z')).toBeTruthy();
  });

  it('combines pinned-only with any selected label', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote({ id: 'pinned', title: 'Pinned Focus', pinned: true, labels: ['Focus'] }),
          makeNote({ id: 'unpinned', title: 'Unpinned Home', labels: ['Home'] }),
          makeNote({ id: 'other', title: 'Pinned Other', pinned: true, labels: ['Other'] }),
        ],
        uiState: 'ready',
      }),
    );

    render(<NotesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Open note filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Pinned only' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Filter notes by Focus' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Filter notes by Home' }));
    fireEvent.press(screen.getByRole('button', { name: 'Apply note filters' }));

    expect(screen.getByText('Pinned Focus')).toBeTruthy();
    expect(screen.queryByText('Unpinned Home')).toBeNull();
    expect(screen.queryByText('Pinned Other')).toBeNull();
  });

  it('keeps search independent while opening filters and note details', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({ notes: [makeNote({ labels: ['Focus'] })], uiState: 'ready' }),
    );
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };

    render(<NotesScreen navigation={navigation} />);
    fireEvent.changeText(screen.getByLabelText('Search notes'), 'capture');
    fireEvent.press(screen.getByLabelText('Open note filters'));
    expect(screen.getByLabelText('Filter notes by Focus')).toBeTruthy();
    expect(screen.getByLabelText('Search notes').props.value).toBe('capture');
    fireEvent.press(screen.getByLabelText('Apply note filters'));

    fireEvent.press(screen.getByLabelText('Open note Captured thought'));
    expect(navigation.navigate).toHaveBeenCalledWith('NoteDetail', { noteId: 'note-1' });
  });

  it('opens the new note modal and saves a manual note', async () => {
    const createNote = jest.fn(async (_input: CreateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(makeUseNotesReturn({ createNote }));

    render(<NotesScreen route={{ params: { createNote: true } }} />);

    fireEvent.changeText(screen.getByLabelText('Note title'), 'Inbox thought');
    fireEvent.changeText(screen.getByLabelText('Note body'), 'Capture this before it disappears.');
    fireEvent.changeText(screen.getByLabelText('New note label'), ' Focus ');
    fireEvent.press(screen.getByLabelText('Add note label'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note'));
    });

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith({
        title: 'Inbox thought',
        body: 'Capture this before it disappears.',
        labels: ['Focus'],
        source: 'manual',
        sourceEventId: null,
        sourceMilestoneId: null,
      });
    });
  });

  it('opens a saved note and edits it', async () => {
    const updateNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [makeNote({ labels: ['Existing'] })],
        uiState: 'ready',
        updateNote,
      }),
    );

    render(<NotesScreen />);

    fireEvent.press(screen.getByLabelText('Open note Captured thought'));
    await openNoteActions();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit note' }));
    fireEvent.changeText(screen.getByLabelText('Edit note title'), 'Sharper title');
    fireEvent.changeText(
      screen.getByLabelText('Edit note body'),
      'Rewritten body for a better saved note.',
    );
    fireEvent.press(screen.getByLabelText('Remove label Existing'));
    fireEvent.changeText(screen.getByLabelText('New note label'), ' Fresh ');
    fireEvent.press(screen.getByLabelText('Add note label'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note changes'));
    });

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith('note-1', {
        title: 'Sharper title',
        body: 'Rewritten body for a better saved note.',
        labels: ['Fresh'],
      });
    });
  });

  it('deletes a saved note after confirmation', async () => {
    const deleteNote = jest.fn(async (_noteId: string) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [makeNote()],
        uiState: 'ready',
        deleteNote,
      }),
    );

    render(<NotesScreen />);

    fireEvent.press(screen.getByLabelText('Open note Captured thought'));
    await openNoteActions();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete note' }));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm note delete'));
    });

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith('note-1');
    });
  });
});
