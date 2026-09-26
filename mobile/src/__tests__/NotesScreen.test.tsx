import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

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

  it('renders saved notes with source metadata', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(
      makeUseNotesReturn({
        notes: [
          makeNote(),
          makeNote({ id: 'note-2', source: 'manual', title: 'Manual note', sourceEventId: null }),
        ],
        uiState: 'ready',
      }),
    );

    render(<NotesScreen />);

    expect(screen.getByText('Captured thought')).toBeTruthy();
    expect(screen.getByText('Manual note')).toBeTruthy();
    expect(screen.getByText('Idea Dump')).toBeTruthy();
    expect(screen.getByText('Manual Note')).toBeTruthy();
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

  it('opens the new note modal and saves a manual note', async () => {
    const createNote = jest.fn(async (_input: CreateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(makeUseNotesReturn({ createNote }));

    render(<NotesScreen route={{ params: { createNote: true } }} />);

    fireEvent.changeText(screen.getByLabelText('Note title'), 'Inbox thought');
    fireEvent.changeText(screen.getByLabelText('Note body'), 'Capture this before it disappears.');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note'));
    });

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith({
        title: 'Inbox thought',
        body: 'Capture this before it disappears.',
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
        notes: [makeNote()],
        uiState: 'ready',
        updateNote,
      }),
    );

    render(<NotesScreen />);

    fireEvent.press(screen.getByLabelText('Open note Captured thought'));
    fireEvent.press(screen.getByLabelText('Edit note'));
    fireEvent.changeText(screen.getByLabelText('Edit note title'), 'Sharper title');
    fireEvent.changeText(
      screen.getByLabelText('Edit note body'),
      'Rewritten body for a better saved note.',
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note changes'));
    });

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith('note-1', {
        title: 'Sharper title',
        body: 'Rewritten body for a better saved note.',
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
    fireEvent.press(screen.getByLabelText('Delete note'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm note delete'));
    });

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith('note-1');
    });
  });
});
