import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { AppCard } from '../components/ui/AppCard';
import { AppIcon } from '../components/ui/AppIcon';
import type { NoteRecord, UpdateNoteInput } from '../features/notes/noteTypes';
import { useNotes } from '../features/notes/useNotes';
import { NoteDetailScreen } from '../screens/NoteDetailScreen';

jest.mock('../features/profile/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({ profile: { locale: 'en-US', timeFormat: '12-hour' } })),
}));

jest.mock('../features/notes/useNotes', () => ({
  useNotes: jest.fn(),
}));

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  const date = new Date(2026, 6, 20, 10, 0, 0);
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Captured thought',
    body: 'A useful thought to keep.',
    labels: ['Focus'],
    source: 'idea_dump',
    sourceEventId: 'event-1',
    sourceMilestoneId: null,
    pinned: false,
    processed: false,
    archived: false,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

function renderDetail(noteOverrides: Partial<NoteRecord> = {}) {
  const pinNote = jest.fn(async (_noteId: string, _pinned: boolean) => undefined);
  const archiveNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
  const updateNote = jest.fn(async (_noteId: string, _fields: UpdateNoteInput) => undefined);
  const deleteNote = jest.fn(async (_noteId: string) => undefined);
  const retry = jest.fn();
  const mockedUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
  mockedUseNotes.mockReturnValue({
    notes: [makeNote(noteOverrides)],
    uiState: 'ready',
    createNote: jest.fn(async () => undefined),
    updateNote,
    pinNote,
    archiveNote,
    deleteNote,
    retry,
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), popTo: jest.fn() };

  render(
    <NoteDetailScreen
      route={{ key: 'NoteDetail', name: 'NoteDetail', params: { noteId: 'note-1' } } as never}
      navigation={navigation as never}
    />,
  );

  return { archiveNote, deleteNote, navigation, pinNote, updateNote };
}

async function openActionsMenu(): Promise<void> {
  fireEvent.press(screen.getByLabelText('More note actions'));
  await waitFor(() => {
    expect(screen.getByRole('menuitem', { name: 'Edit note' })).toBeTruthy();
  });
}

describe('NoteDetailScreen', () => {
  it('shows note content, labels, compact dates, and edit/conversion actions', async () => {
    const { navigation } = renderDetail();

    expect(screen.getByText('Captured thought')).toBeTruthy();
    expect(screen.getByText('A useful thought to keep.')).toBeTruthy();
    expect(screen.getByText('Focus')).toBeTruthy();
    expect(screen.getByText(/^Updated .* · Created /)).toBeTruthy();
    expect(screen.queryByText('DATES')).toBeNull();
    expect(screen.UNSAFE_queryAllByType(AppCard)).toHaveLength(0);
    const renderedIcons = screen.UNSAFE_getAllByType(AppIcon).map((icon) => icon.props.name);
    expect(renderedIcons).toContain('date');
    expect(renderedIcons).toContain('tags');
    expect(screen.queryByText(/Origin/)).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('note-conversion-section').props.style).flexDirection,
    ).toBe('column');
    expect(
      StyleSheet.flatten(screen.getByTestId('note-conversion-section-header').props.style)
        .flexDirection,
    ).toBe('row');
    expect(
      StyleSheet.flatten(screen.getByTestId('note-conversion-actions').props.style).alignSelf,
    ).toBe('stretch');
    expect(
      StyleSheet.flatten(screen.getByTestId('note-conversion-actions').props.style).flexDirection,
    ).toBe('row');
    expect(screen.getByLabelText('Create task from note').findByType(AppIcon).props.name).toBe(
      'task',
    );
    expect(screen.getByLabelText('Create goal from note').findByType(AppIcon).props.name).toBe(
      'goal',
    );
    expect(screen.getByLabelText('Create event from note').findByType(AppIcon).props.name).toBe(
      'calendar',
    );

    await openActionsMenu();
    expect(screen.getByRole('menuitem', { name: 'Pin note' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Archive note' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete note' })).toBeTruthy();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Edit note' }));
    expect(navigation.navigate).toHaveBeenCalledWith('NoteEditor', { noteId: 'note-1' });
    fireEvent.press(screen.getByLabelText('Create task from note'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreateTaskFromNote', { noteId: 'note-1' });
  });

  it('pins and archives a note while preserving labels and origin fields', async () => {
    const { archiveNote, navigation, pinNote } = renderDetail();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Pin note'));
    });
    expect(pinNote).toHaveBeenCalledWith('note-1', true);

    await openActionsMenu();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Archive note' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm note archive'));
    });
    await waitFor(() =>
      expect(archiveNote).toHaveBeenCalledWith('note-1', {
        title: 'Captured thought',
        body: 'A useful thought to keep.',
        labels: ['Focus'],
        pinned: false,
      }),
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('confirms permanent note deletion', async () => {
    const { deleteNote } = renderDetail();

    await openActionsMenu();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete note' }));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm note delete'));
    });
    await waitFor(() => expect(deleteNote).toHaveBeenCalledWith('note-1'));
  });

  it('restores an archived note and returns to the active Notes view', async () => {
    const { navigation, updateNote } = renderDetail({ archived: true });

    await openActionsMenu();
    expect(screen.queryByRole('menuitem', { name: 'Archive note' })).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('menuitem', { name: 'Restore note' }));
    });

    expect(updateNote).toHaveBeenCalledWith('note-1', {
      title: 'Captured thought',
      body: 'A useful thought to keep.',
      labels: ['Focus'],
      pinned: false,
      archived: false,
    });
    expect(navigation.popTo).toHaveBeenCalledWith('NotesHome', { resetView: true });
  });
});
