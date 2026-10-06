import { NoteRecord } from './noteTypes';
import { normalizeNoteLabels } from './noteLabels';

type TimestampLike = { toDate: () => Date };

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as TimestampLike).toDate();
  }
  return new Date(0);
}

export function decodeNoteData(id: string, data: Record<string, unknown>): NoteRecord {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    body: data.body as string,
    labels: normalizeNoteLabels(data.labels),
    source: data.source as NoteRecord['source'],
    sourceEventId: (data.sourceEventId as string | null) ?? null,
    sourceMilestoneId: (data.sourceMilestoneId as string | null) ?? null,
    pinned: data.pinned === true,
    processed: data.processed === true,
    archived: data.archived === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
