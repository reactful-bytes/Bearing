import { CalendarEvent, EventStatus } from './calendarTypes';

type TimestampLike = { toDate: () => Date };

export function decodeCalendarEventData(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    description: data.description as string,
    startAt: (data.startAt as TimestampLike).toDate(),
    endAt: (data.endAt as TimestampLike).toDate(),
    timezone: data.timezone as string,
    goalId: (data.goalId as string | null) ?? null,
    stepId: (data.stepId as string | null) ?? null,
    status: data.status as EventStatus,
    createdAt: (data.createdAt as TimestampLike).toDate(),
    updatedAt: (data.updatedAt as TimestampLike).toDate(),
  };
}
