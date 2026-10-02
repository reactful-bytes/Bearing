import { describe, expect, it, jest } from '@jest/globals';

import {
  TaskConversionEvent,
  TaskConversionStore,
  TaskConversionTask,
  TaskConversionTransaction,
  convertTaskToEventAtomically,
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
  const updateEvent = jest.fn<TaskConversionTransaction['updateEvent']>((eventId, eventInput) => {
    if (!event) throw new Error(`Event ${eventId} not found.`);
    event = { ...event, input: eventInput };
  });
  const store: TaskConversionStore = {
    runTransaction: (operation) => {
      const result = queue.then(() =>
        operation({
          getTask: async () => task,
          getEvent: async () => event,
          createEvent,
          updateEvent,
        }),
      );
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };

  return { store, createEvent, updateEvent, getTask: () => task };
}

describe('taskConversionService', () => {
  it('creates one deterministic event without completing the task', async () => {
    const { store, createEvent, getTask } = makeStore();

    await expect(convertTaskToEventAtomically(store, 'user-1', 'task-1', input)).resolves.toEqual({
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
    expect(getTask()?.status).toBe('active');
  });

  it('keeps the task active when the event write fails', async () => {
    const { store, getTask } = makeStore({ failCreate: true });

    await expect(convertTaskToEventAtomically(store, 'user-1', 'task-1', input)).rejects.toThrow(
      'Simulated event write failure.',
    );
    expect(getTask()?.status).toBe('active');
  });

  it('updates an existing linked event without completing its active task', async () => {
    const previousInput = { ...input, title: 'Old title' };
    const event = { userId: 'user-1', sourceTaskId: 'task-1', input: previousInput };
    const { store, createEvent, updateEvent, getTask } = makeStore({ event });

    await expect(convertTaskToEventAtomically(store, 'user-1', 'task-1', input)).resolves.toEqual({
      eventId: 'task-task-1',
      eventInput: input,
      created: false,
    });
    expect(createEvent).not.toHaveBeenCalled();
    expect(updateEvent).toHaveBeenCalledWith('task-task-1', input, expect.any(Date));
    expect(getTask()?.status).toBe('active');
  });

  it('serializes concurrent submissions into one event', async () => {
    const { store, createEvent, updateEvent, getTask } = makeStore();

    const results = await Promise.all([
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input),
      convertTaskToEventAtomically(store, 'user-1', 'task-1', input),
    ]);

    expect(results.map((result) => result.eventId)).toEqual(['task-task-1', 'task-task-1']);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(getTask()?.status).toBe('active');
  });

  it('rejects completed tasks linked to another event', async () => {
    const { store } = makeStore({
      task: {
        userId: 'user-1',
        status: 'completed',
      },
    });

    await expect(convertTaskToEventAtomically(store, 'user-1', 'task-1', input)).rejects.toThrow(
      'Task has already been completed.',
    );
  });
});
