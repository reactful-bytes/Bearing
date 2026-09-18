import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useNotes } from '../features/notes/useNotes';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({ profile: { locale: 'en-US', timeFormat: '12-hour' } })),
}));

jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(),
}));

function makeNote(): NoteRecord {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Captured thought',
    body: 'Turn this into something useful.',
    source: 'manual',
    sourceEventId: null,
    sourceStepId: null,
    processed: false,
    pinned: false,
    archived: false,
    createdAt: new Date(2026, 6, 20, 10, 0, 0),
    updatedAt: new Date(2026, 6, 20, 10, 0, 0),
  };
}

describe('NoteEditorScreen', () => {
  it('updates, archives, deletes with confirmation, and opens conversions', async () => {
    const updateNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
    const pinNote = jest.fn(async (_noteId: string, _pinned: boolean) => undefined);
    const archiveNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
    const deleteNote = jest.fn(async (_noteId: string) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue({
      notes: [makeNote()],
      uiState: 'ready',
      createNote: jest.fn(async () => undefined),
      updateNote,
      pinNote,
      archiveNote,
      deleteNote,
      retry: jest.fn(),
    });
    const goBack = jest.fn();

    render(<NoteEditorScreen route={{ params: { noteId: 'note-1' } }} navigation={{ goBack }} />);

    fireEvent.changeText(screen.getByLabelText('Note body'), 'Updated note body.');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note changes'));
    });
    expect(updateNote).toHaveBeenCalledWith('note-1', {
      title: 'Captured thought',
      body: 'Updated note body.',
      pinned: false,
    });
    expect(goBack).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Archive Note'));
    await waitFor(() =>
      expect(archiveNote).toHaveBeenCalledWith('note-1', {
        title: 'Captured thought',
        body: 'Updated note body.',
        pinned: false,
      }),
    );

    fireEvent.press(screen.getByText('Delete Note'));
    expect(screen.getByText('Delete this note permanently?')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm note delete'));
    });
    expect(deleteNote).toHaveBeenCalledWith('note-1');

    fireEvent.press(screen.getByText('Create Task'));
    expect(mockNavigate).toHaveBeenCalledWith('CreateTaskFromNote', { noteId: 'note-1' });
  });

  it('persists pinning immediately without saving the editor form', async () => {
    const pinNote = jest.fn(async (_noteId: string, _pinned: boolean) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue({
      notes: [makeNote()],
      uiState: 'ready',
      createNote: jest.fn(async () => undefined),
      updateNote: jest.fn(async () => undefined),
      pinNote,
      archiveNote: jest.fn(async () => undefined),
      deleteNote: jest.fn(async () => undefined),
      retry: jest.fn(),
    });

    render(
      <NoteEditorScreen
        route={{ params: { noteId: 'note-1' } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Note body'), 'Unsaved body stays local.');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Pin note'));
    });

    expect(pinNote).toHaveBeenCalledWith('note-1', true);
    expect(screen.getByLabelText('Unpin note')).toBeTruthy();
  });
});
