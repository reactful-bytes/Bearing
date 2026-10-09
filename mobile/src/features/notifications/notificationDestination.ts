export type NotificationDestination =
  | { kind: 'event'; eventId: string; dateIso: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'tasks' };

export function getNotificationDestination(
  data: Record<string, unknown>,
  userId: string,
): NotificationDestination | null {
  if (data.userId !== userId) return null;
  if (
    data.kind === 'event' &&
    typeof data.eventId === 'string' &&
    data.eventId &&
    typeof data.dateIso === 'string' &&
    Number.isFinite(Date.parse(data.dateIso))
  ) {
    return { kind: 'event', eventId: data.eventId, dateIso: data.dateIso };
  }
  if (data.kind === 'due') {
    return typeof data.taskId === 'string' && data.taskId
      ? { kind: 'task', taskId: data.taskId }
      : { kind: 'tasks' };
  }
  return null;
}
