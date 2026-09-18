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
});
