import { describe, expect, it } from '@jest/globals';

import { sortNotes, sortNotesForView } from '../features/notes/noteSorting';
import { NoteRecord } from '../features/notes/noteTypes';

function note(id: string, updatedAt: string, pinned = false): NoteRecord {
  const date = new Date(updatedAt);
  return {
    id,
    userId: 'user-1',
    title: id,
    body: id,
    labels: [],
    source: 'manual',
    sourceEventId: null,
    sourceMilestoneId: null,
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

  it('sorts by created date and title without grouping labels or pins', () => {
    const notes = [
      {
        ...note('beta', '2026-07-31T09:00:00.000Z', true),
        title: 'Beta',
        createdAt: new Date('2026-07-01'),
      },
      {
        ...note('alpha', '2026-07-31T10:00:00.000Z'),
        title: 'alpha',
        createdAt: new Date('2026-07-02'),
      },
      {
        ...note('gamma', '2026-07-31T08:00:00.000Z'),
        title: 'Gamma',
        createdAt: new Date('2026-07-03'),
      },
    ];

    expect(sortNotesForView(notes, 'created:asc').map(({ id }) => id)).toEqual([
      'beta',
      'alpha',
      'gamma',
    ]);
    expect(sortNotesForView(notes, 'title:asc').map(({ id }) => id)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(sortNotesForView(notes, 'updated:asc').map(({ id }) => id)).toEqual([
      'gamma',
      'beta',
      'alpha',
    ]);
  });
});
