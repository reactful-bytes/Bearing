import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { addDoc, updateDoc } from 'firebase/firestore';

import { createNote, updateNote } from './firebaseNotes';

jest.mock('firebase/firestore', () => ({
  Timestamp: { now: jest.fn(() => 'timestamp') },
  addDoc: jest.fn(async () => ({ id: 'note-1' })),
  collection: jest.fn(() => 'notes-collection'),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => 'note-reference'),
  getFirestore: jest.fn(() => 'firestore'),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(async () => undefined),
  where: jest.fn(),
}));

jest.mock('./firebaseApp', () => ({
  getFirebaseApp: jest.fn(() => ({})),
}));

describe('firebase note label persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes labels when creating a note', async () => {
    await createNote('user-1', {
      body: 'Captured thought',
      labels: [' Work ', 'work', ' Ideas '],
      source: 'idea_dump',
      sourceEventId: 'event-1',
    });

    expect(addDoc).toHaveBeenCalledWith(
      'notes-collection',
      expect.objectContaining({
        labels: ['Work', 'Ideas'],
        source: 'idea_dump',
        sourceEventId: 'event-1',
      }),
    );
  });

  it('normalizes labels on edit without overwriting origin metadata', async () => {
    await updateNote('user-1', 'note-1', {
      title: 'Edited thought',
      body: 'Updated text',
      labels: [' Project ', 'project'],
    });

    expect(updateDoc).toHaveBeenCalledWith(
      'note-reference',
      expect.objectContaining({
        labels: ['Project'],
      }),
    );
    const updatePayload = jest.mocked(updateDoc).mock.calls[0]?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(updatePayload).not.toHaveProperty('source');
    expect(updatePayload).not.toHaveProperty('sourceEventId');
    expect(updatePayload).not.toHaveProperty('sourceMilestoneId');
  });

  it('omits labels from edits that do not change labels', async () => {
    await updateNote('user-1', 'note-1', {
      title: 'Edited thought',
      body: 'Updated text',
    });

    const updatePayload = jest.mocked(updateDoc).mock.calls[0]?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(updatePayload).not.toHaveProperty('labels');
  });
});
