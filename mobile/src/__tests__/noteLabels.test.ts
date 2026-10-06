import { describe, expect, it } from '@jest/globals';

import { normalizeNoteLabels } from '../features/notes/noteLabels';

describe('normalizeNoteLabels', () => {
  it('trims labels, drops empty values, and deduplicates without changing first spelling', () => {
    expect(normalizeNoteLabels([' Work ', 'work', 'Ideas', ' ideas ', ''])).toEqual([
      'Work',
      'Ideas',
    ]);
  });

  it('treats missing or invalid persisted labels as an empty list', () => {
    expect(normalizeNoteLabels(undefined)).toEqual([]);
    expect(normalizeNoteLabels(['valid', null, 3])).toEqual(['valid']);
  });
});
