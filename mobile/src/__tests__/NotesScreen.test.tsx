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
    sourceStepId: null,
    processed: false,
    archived: false,
    createdAt: new Date(2026, 6, 20, 10, 0, 0),
    updatedAt: new Date(2026, 6, 20, 10, 0, 0),
    ...overrides,
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
    expect(screen.getByText('New Note')).toBeTruthy();
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

  it('opens the new note modal and saves a manual note', async () => {
    const createNote = jest.fn(async (_input: CreateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue(makeUseNotesReturn({ createNote }));

    render(<NotesScreen />);

    fireEvent.press(screen.getByText('New Note'));
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
