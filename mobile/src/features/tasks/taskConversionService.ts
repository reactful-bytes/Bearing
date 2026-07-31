import { CreateEventInput } from '../calendar/calendarTypes';
import { TaskCompletionSource } from './taskTypes';

export type TaskConversionCompletionSource = Extract<
  TaskCompletionSource,
  'scheduled' | 'start_now'
>;

export type TaskConversionTask = {
  userId: string;
  status: 'active' | 'completed';
  completionSource: TaskCompletionSource | null;
  completedEventId: string | null;
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
  completeTask: (
    taskId: string,
    completionSource: TaskConversionCompletionSource,
    eventId: string,
    now: Date,
  ) => void;
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
  completionSource: TaskConversionCompletionSource,
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

    if (task.status === 'completed') {
      if (
        task.completedEventId === eventId &&
        task.completionSource === completionSource &&
        existingEvent
      ) {
        return { eventId, eventInput: existingEvent.input, created: false };
      }
      throw new Error('Task has already been completed.');
    }

    const conversionTime = now();
    if (!existingEvent) {
      transaction.createEvent(eventId, userId, taskId, input, conversionTime);
    }
    transaction.completeTask(taskId, completionSource, eventId, conversionTime);

    return {
      eventId,
      eventInput: existingEvent?.input ?? input,
      created: !existingEvent,
    };
  });
}
