import { describe, expect, it, jest } from '@jest/globals';

import {
  TaskConversionEvent,
  TaskConversionStore,
  TaskConversionTask,
  TaskConversionTransaction,
  convertTaskToEventAtomically,
  taskConversionEventId,
} from '../features/tasks/taskConversionService';
import { CreateEventInput } from '../features/calendar/calendarTypes';

const input: CreateEventInput = {
  title: 'Write proposal',
  description: 'Draft the summary.',
  startAt: new Date('2026-07-31T13:00:00.000Z'),
  endAt: new Date('2026-07-31T13:30:00.000Z'),
  timezone: 'UTC',
};

function activeTask(): TaskConversionTask {
  return {
    userId: 'user-1',
    status: 'active',
    completionSource: null,
    completedEventId: null,
  };
}

function makeStore(
  options: {
    task?: TaskConversionTask | null;
    event?: TaskConversionEvent | null;
    failCreate?: boolean;
  } = {},
) {
  let task = options.task === undefined ? activeTask() : options.task;
  let event = options.event ?? null;
  let queue = Promise.resolve();
  const createEvent = jest.fn<TaskConversionTransaction['createEvent']>(
    (eventId, userId, taskId, eventInput) => {
      if (options.failCreate) throw new Error('Simulated event write failure.');
      event = { userId, sourceTaskId: taskId, input: eventInput };
    },
  );
  const completeTask = jest.fn<TaskConversionTransaction['completeTask']>(
    (_taskId, completionSource, eventId) => {
      task = {
        userId: task?.userId ?? 'user-1',
        status: 'completed',
        completionSource,
        completedEventId: eventId,
      };
    },
  );
  const store: TaskConversionStore = {
    runTransaction: (operation) => {
      const result = queue.then(() =>
        operation({
          getTask: async () => task,
          getEvent: async () => event,
          createEvent,
          completeTask,
        }),
      );
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };

  return { store, createEvent, completeTask };
}

describe('taskConversionService', () => {
  it('creates one deterministic event and completes the task in one transaction', async () => {
    const { store, createEvent, completeTask } = makeStore();

    await expect(
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'scheduled'),
    ).resolves.toEqual({
      eventId: 'task-task-1',
      eventInput: input,
      created: true,
    });
    expect(createEvent).toHaveBeenCalledWith(
      'task-task-1',
      'user-1',
      'task-1',
      input,
      expect.any(Date),
    );
    expect(completeTask).toHaveBeenCalledWith(
      'task-1',
      'scheduled',
      'task-task-1',
      expect.any(Date),
    );
  });

  it('does not complete the task when the event write fails', async () => {
    const { store, completeTask } = makeStore({ failCreate: true });

    await expect(
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'scheduled'),
    ).rejects.toThrow('Simulated event write failure.');
    expect(completeTask).not.toHaveBeenCalled();
  });

  it('returns the original event for an idempotent retry', async () => {
    const eventId = taskConversionEventId('task-1');
    const event = { userId: 'user-1', sourceTaskId: 'task-1', input };
    const { store, createEvent, completeTask } = makeStore({
      task: {
        userId: 'user-1',
        status: 'completed',
        completionSource: 'start_now',
        completedEventId: eventId,
      },
      event,
    });

    await expect(
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'start_now'),
    ).resolves.toEqual({ eventId, eventInput: input, created: false });
    expect(createEvent).not.toHaveBeenCalled();
    expect(completeTask).not.toHaveBeenCalled();
  });

  it('serializes concurrent submissions into one event', async () => {
    const { store, createEvent, completeTask } = makeStore();

    const results = await Promise.all([
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'scheduled'),
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'scheduled'),
    ]);

    expect(results.map((result) => result.eventId)).toEqual(['task-task-1', 'task-task-1']);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(completeTask).toHaveBeenCalledTimes(1);
  });

  it('rejects completed tasks linked to another event', async () => {
    const { store } = makeStore({
      task: {
        userId: 'user-1',
        status: 'completed',
        completionSource: 'manual',
        completedEventId: null,
      },
    });

    await expect(
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input, 'scheduled'),
    ).rejects.toThrow('Task has already been completed.');
  });
});
