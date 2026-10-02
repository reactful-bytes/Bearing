import { CreateEventInput } from '../calendar/calendarTypes';

export type TaskConversionTask = {
  userId: string;
  status: 'active' | 'completed';
};

export type TaskConversionEvent = {
  userId: string;
  sourceTaskId: string;
  input: CreateEventInput;
};

export type TaskConversionTransaction = {
  getTask: (taskId: string) => Promise<TaskConversionTask | null>;
  getEvent: (eventId: string) => Promise<TaskConversionEvent | null>;
  createEvent: (
    eventId: string,
    userId: string,
    taskId: string,
    input: CreateEventInput,
    now: Date,
  ) => void;
  updateEvent: (eventId: string, input: CreateEventInput, now: Date) => void;
};

export type TaskConversionStore = {
  runTransaction: <Result>(
    operation: (transaction: TaskConversionTransaction) => Promise<Result>,
  ) => Promise<Result>;
};

export type TaskConversionResult = {
  eventId: string;
  eventInput: CreateEventInput;
  created: boolean;
};

export function taskConversionEventId(taskId: string): string {
  return `task-${taskId}`;
}

function validateExistingEvent(
  event: TaskConversionEvent | null,
  userId: string,
  taskId: string,
): TaskConversionEvent | null {
  if (!event) return null;
  if (event.userId !== userId || event.sourceTaskId !== taskId) {
    throw new Error('Task conversion event ownership does not match.');
  }
  return event;
}

export async function convertTaskToEventAtomically(
  store: TaskConversionStore,
  userId: string,
  taskId: string,
  input: CreateEventInput,
  now: () => Date = () => new Date(),
): Promise<TaskConversionResult> {
  const eventId = taskConversionEventId(taskId);

  return store.runTransaction(async (transaction) => {
    const task = await transaction.getTask(taskId);
    const existingEvent = validateExistingEvent(
      await transaction.getEvent(eventId),
      userId,
      taskId,
    );

    if (!task) throw new Error('Task not found.');
    if (task.userId !== userId) throw new Error('Task ownership does not match.');

    if (task.status === 'completed') throw new Error('Task has already been completed.');

    const conversionTime = now();
    if (existingEvent) {
      transaction.updateEvent(eventId, input, conversionTime);
    } else {
      transaction.createEvent(eventId, userId, taskId, input, conversionTime);
    }

    return {
      eventId,
      eventInput: input,
      created: !existingEvent,
    };
  });
}
