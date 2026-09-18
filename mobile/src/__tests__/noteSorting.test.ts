import { describe, expect, it } from '@jest/globals';

import { sortNotes } from '../features/notes/noteSorting';
import { NoteRecord } from '../features/notes/noteTypes';

function note(id: string, updatedAt: string, pinned = false): NoteRecord {
  const date = new Date(updatedAt);
  return {
    id,
    userId: 'user-1',
    title: id,
    body: id,
    source: 'manual',
    sourceEventId: null,
    sourceStepId: null,
    pinned,
    processed: false,
    archived: false,
    createdAt: date,
    updatedAt: date,
  };
}

describe('sortNotes', () => {
  it('orders pinned notes first, then newest updates with an ID tie-breaker', () => {
    const sorted = sortNotes([
      note('z-note', '2026-07-31T10:00:00.000Z'),
      note('b-note', '2026-07-31T09:00:00.000Z', true),
      note('a-note', '2026-07-31T09:00:00.000Z', true),
      note('new-note', '2026-07-31T11:00:00.000Z'),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(['a-note', 'b-note', 'new-note', 'z-note']);
  });
});
