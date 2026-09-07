import { CreateTaskInput, UpdateTaskInput } from './taskTypes';

export type TimestampFactory = (value: Date) => unknown;

type TaskSchedulingFields = Pick<
  CreateTaskInput,
  'goalId' | 'stepId' | 'dueDate' | 'scheduledStart' | 'scheduledEnd' | 'allDay'
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
    stepId: input.stepId ?? null,
    dueDate: toTimestamp(input.dueDate, timestampFactory),
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

  if (fields.goalId !== undefined) updates.goalId = fields.goalId;
  if (fields.stepId !== undefined) updates.stepId = fields.stepId;
  if (fields.dueDate !== undefined) {
    updates.dueDate = toTimestamp(fields.dueDate, timestampFactory);
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
