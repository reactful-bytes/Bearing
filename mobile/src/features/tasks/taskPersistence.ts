import { CreateTaskInput, UpdateTaskInput } from './taskTypes';
import { taskDueDateKey } from './taskDueDate';

export type TimestampFactory = (value: Date) => unknown;

type TaskSchedulingFields = Pick<
  CreateTaskInput,
  | 'starter'
  | 'goalId'
  | 'milestoneId'
  | 'dueDate'
  | 'dueDateKey'
  | 'scheduledStart'
  | 'scheduledEnd'
  | 'allDay'
>;

function toTimestamp(value: Date | null | undefined, timestampFactory: TimestampFactory): unknown {
  return value ? timestampFactory(value) : null;
}

export function buildTaskCreateFields(
  input: TaskSchedulingFields,
  timestampFactory: TimestampFactory,
): Record<string, unknown> {
  return {
    goalId: input.goalId ?? null,
    milestoneId: input.milestoneId ?? null,
    starter: input.starter?.trim() ?? '',
    dueDate: toTimestamp(input.dueDate, timestampFactory),
    dueDateKey: taskDueDateKey(input.dueDate, input.dueDateKey),
    scheduledStart: toTimestamp(input.scheduledStart, timestampFactory),
    scheduledEnd: toTimestamp(input.scheduledEnd, timestampFactory),
    allDay: input.allDay ?? false,
  };
}

export function buildTaskUpdateFields(
  fields: UpdateTaskInput,
  timestampFactory: TimestampFactory,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (fields.dueDateKey !== undefined && fields.dueDate === undefined) {
    throw new Error('Update the task due date alongside its date key.');
  }

  if (fields.starter !== undefined) updates.starter = fields.starter.trim();
  if (fields.goalId !== undefined) updates.goalId = fields.goalId;
  if (fields.milestoneId !== undefined) updates.milestoneId = fields.milestoneId;
  if (fields.dueDate !== undefined) {
    updates.dueDate = toTimestamp(fields.dueDate, timestampFactory);
    updates.dueDateKey = taskDueDateKey(fields.dueDate, fields.dueDateKey);
  }
  if (fields.scheduledStart !== undefined) {
    updates.scheduledStart = toTimestamp(fields.scheduledStart, timestampFactory);
  }
  if (fields.scheduledEnd !== undefined) {
    updates.scheduledEnd = toTimestamp(fields.scheduledEnd, timestampFactory);
  }
  if (fields.allDay !== undefined) updates.allDay = fields.allDay;

  return updates;
}
