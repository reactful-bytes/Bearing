import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useNotes } from '../features/notes/useNotes';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';

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
    labels: ['Focus'],
    source: 'manual',
    sourceEventId: null,
    sourceMilestoneId: null,
    processed: false,
    pinned: false,
    archived: false,
    createdAt: new Date(2026, 6, 20, 10, 0, 0),
    updatedAt: new Date(2026, 6, 20, 10, 0, 0),
  };
}

describe('NoteEditorScreen', () => {
  it('updates note content and labels without exposing note management actions', async () => {
    const updateNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue({
      notes: [makeNote()],
      uiState: 'ready',
      createNote: jest.fn(async () => undefined),
      updateNote,
      pinNote: jest.fn(async () => undefined),
      archiveNote: jest.fn(async () => undefined),
      deleteNote: jest.fn(async () => undefined),
      retry: jest.fn(),
    });
    const goBack = jest.fn();

    render(<NoteEditorScreen route={{ params: { noteId: 'note-1' } }} navigation={{ goBack }} />);

    expect(screen.getByRole('header', { name: 'Edit Note' })).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Note body'), 'Updated note body.');
    fireEvent.changeText(screen.getByLabelText('New note label'), ' Draft ');
    fireEvent.press(screen.getByLabelText('Add note label'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save note changes'));
    });
    expect(updateNote).toHaveBeenCalledWith('note-1', {
      title: 'Captured thought',
      body: 'Updated note body.',
      labels: ['Focus', 'Draft'],
    });
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Use this note')).toBeNull();
    expect(screen.queryByLabelText('Pin note')).toBeNull();
    expect(screen.queryByText('Archive Note')).toBeNull();
    expect(screen.queryByText('Delete Note')).toBeNull();
  });

  it('keeps the editor focused on editable fields and save', () => {
    const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
    mockedUseNotes.mockReturnValue({
      notes: [makeNote()],
      uiState: 'ready',
      createNote: jest.fn(async () => undefined),
      updateNote: jest.fn(async () => undefined),
      pinNote: jest.fn(async () => undefined),
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

    expect(screen.getByLabelText('Note title')).toBeTruthy();
    expect(screen.getByLabelText('Note body')).toBeTruthy();
    expect(screen.getByLabelText('Save note changes')).toBeTruthy();
    expect(screen.queryByText('Use this note')).toBeNull();
    expect(screen.queryByLabelText('Pin note')).toBeNull();
    expect(screen.queryByText('Archive Note')).toBeNull();
    expect(screen.queryByText('Delete Note')).toBeNull();
  });
});
