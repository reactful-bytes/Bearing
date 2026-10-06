import { describe, expect, it } from '@jest/globals';

import { decodeNoteData } from '../features/notes/noteDecoder';

function timestamp(value: Date): { toDate: () => Date } {
  return { toDate: () => value };
}

describe('decodeNoteData', () => {
  it('defaults legacy pin state to false', () => {
    const createdAt = new Date(2026, 6, 31, 9);
    const decoded = decodeNoteData('legacy-note', {
      userId: 'user-1',
      title: 'Legacy note',
      body: 'Retain this note.',
      source: 'manual',
      createdAt: timestamp(createdAt),
      updatedAt: timestamp(createdAt),
    });

    expect(decoded.pinned).toBe(false);
    expect(decoded.processed).toBe(false);
    expect(decoded.archived).toBe(false);
    expect(decoded.labels).toEqual([]);
  });

  it('preserves an explicitly pinned note', () => {
    const note = decodeNoteData('pinned-note', {
      userId: 'user-1',
      title: 'Pinned note',
      body: 'Keep this visible.',
      source: 'manual',
      pinned: true,
      createdAt: timestamp(new Date(2026, 6, 31, 9)),
      updatedAt: timestamp(new Date(2026, 6, 31, 9)),
    });

    expect(note.pinned).toBe(true);
  });

  it('normalizes persisted labels and preserves origin metadata', () => {
    const note = decodeNoteData('labeled-note', {
      userId: 'user-1',
      title: 'Labeled note',
      body: 'Keep this note.',
      source: 'idea_dump',
      sourceEventId: 'event-1',
      sourceMilestoneId: 'milestone-1',
      labels: [' Work ', 'work', '', 'Ideas'],
      createdAt: timestamp(new Date(2026, 6, 31, 9)),
      updatedAt: timestamp(new Date(2026, 6, 31, 9)),
    });

    expect(note.labels).toEqual(['Work', 'Ideas']);
    expect(note.source).toBe('idea_dump');
    expect(note.sourceEventId).toBe('event-1');
    expect(note.sourceMilestoneId).toBe('milestone-1');
  });
});
