import { TaskRecord } from './taskTypes';

type TimestampLike = { toDate: () => Date };

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as TimestampLike).toDate();
  }
  return null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function decodeTaskData(id: string, data: Record<string, unknown>): TaskRecord {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    description: data.description as string,
    starter: typeof data.starter === 'string' ? data.starter : '',
    goalId: nullableString(data.goalId),
    milestoneId: nullableString(data.milestoneId),
    dueDate: toDate(data.dueDate),
    scheduledStart: toDate(data.scheduledStart),
    scheduledEnd: toDate(data.scheduledEnd),
    allDay: data.allDay === true,
    status: data.status as TaskRecord['status'],
    completionSource: (data.completionSource as TaskRecord['completionSource']) ?? null,
    completedAt: toDate(data.completedAt),
    completedEventId: nullableString(data.completedEventId),
    createdAt: (data.createdAt as TimestampLike).toDate(),
    updatedAt: (data.updatedAt as TimestampLike).toDate(),
  };
}
