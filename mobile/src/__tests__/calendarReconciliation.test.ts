import { describe, expect, it } from '@jest/globals';

import {
  CalendarPublicationMarker,
  ReconciliationEventFields,
  canonicalCalendarFieldHash,
  createOpaqueLinkId,
  decideCalendarReconciliation,
  parsePublicationMarker,
  replacePublicationMarker,
  serializePublicationMarker,
} from '../features/calendar/calendarReconciliation';

const marker: CalendarPublicationMarker = {
  version: 1,
  linkId: '0123456789abcdef0123456789abcdef',
  commonHash: 'h1-0123456789abcdef',
};

function fields(overrides: Partial<ReconciliationEventFields> = {}): ReconciliationEventFields {
  return {
    title: 'Planning',
    description: 'Bring the roadmap.',
    startAt: new Date('2026-07-31T13:00:00.000Z'),
    endAt: new Date('2026-07-31T14:00:00.000Z'),
    timezone: 'UTC',
    allDay: false,
    location: 'Studio',
    recurrenceRule: null,
    alarms: [{ absoluteAt: null, relativeOffsetMinutes: -15 }],
    availability: 'busy',
    url: null,
    ...overrides,
  };
}

describe('calendarReconciliation markers', () => {
  it('round-trips opaque metadata without exposing account or event content', () => {
    const serialized = serializePublicationMarker(marker);

    expect(serialized).toContain('v1');
    expect(serialized).toContain(marker.linkId);
    expect(serialized).toContain(marker.commonHash);
    expect(serialized).not.toContain('firebase-user-123');
    expect(serialized).not.toContain('Planning');
    expect(parsePublicationMarker(`Private notes\nline two\n\n${serialized}`)).toEqual({
      marker,
      userNotes: 'Private notes\nline two',
    });
  });

  it.each(['', 'plain notes', 'notes ending in whitespace\n\n', 'line one\nline two'])(
    'preserves user notes exactly when adding and replacing a marker: %j',
    (notes) => {
      const marked = replacePublicationMarker(notes, marker);
      expect(parsePublicationMarker(marked)).toEqual({ marker, userNotes: notes });

      const replacement = { ...marker, commonHash: 'h1-fedcba9876543210' };
      expect(parsePublicationMarker(replacePublicationMarker(marked, replacement))).toEqual({
        marker: replacement,
        userNotes: notes,
      });
    },
  );

  it('ignores malformed and embedded marker-like text', () => {
    const notes = 'Keep [[bearing:v1:not-valid:h1-0123456789abcdef]] in these notes.';
    expect(parsePublicationMarker(notes)).toEqual({ marker: null, userNotes: notes });
  });

  it('creates deterministic-width opaque IDs with injectable randomness', () => {
    expect(createOpaqueLinkId(() => 0.5)).toBe('80000000800000008000000080000000');
  });
});

describe('calendarReconciliation hashing and conflicts', () => {
  it('hashes canonical fields deterministically and ignores marker decoration', () => {
    const baseHash = canonicalCalendarFieldHash(fields());
    const decoratedHash = canonicalCalendarFieldHash(
      fields({ description: replacePublicationMarker('Bring the roadmap.', marker) }),
    );

    expect(baseHash).toMatch(/^h1-[a-f0-9]{16}$/);
    expect(decoratedHash).toBe(baseHash);
    expect(canonicalCalendarFieldHash(fields({ title: 'Changed' }))).not.toBe(baseHash);
    expect(canonicalCalendarFieldHash(fields({ allDay: true }))).not.toBe(baseHash);
    expect(
      canonicalCalendarFieldHash(
        fields({
          recurrenceRule: {
            frequency: 'weekly',
            interval: 1,
            endAt: null,
            occurrenceCount: null,
            weekdays: ['monday', 'wednesday'],
          },
        }),
      ),
    ).not.toBe(baseHash);
  });

  it('dedupes unchanged and independently equal linked copies', () => {
    expect(decideCalendarReconciliation('same', 'same', 'same')).toEqual({
      action: 'none',
      winningHash: 'same',
      reason: 'unchanged',
    });
    expect(decideCalendarReconciliation('new', 'new', 'old')).toEqual({
      action: 'none',
      winningHash: 'new',
      reason: 'already-equal',
    });
  });

  it('propagates one-sided changes', () => {
    expect(decideCalendarReconciliation('bearing-new', 'common', 'common').action).toBe(
      'update-device',
    );
    expect(decideCalendarReconciliation('common', 'device-new', 'common').action).toBe(
      'update-bearing',
    );
  });

  it('selects the device version for simultaneous or unknown divergence', () => {
    expect(decideCalendarReconciliation('bearing-new', 'device-new', 'common')).toEqual({
      action: 'update-bearing',
      winningHash: 'device-new',
      reason: 'simultaneous-device-wins',
    });
    expect(decideCalendarReconciliation('bearing', 'device', null)).toEqual({
      action: 'update-bearing',
      winningHash: 'device',
      reason: 'unknown-device-wins',
    });
  });
});
