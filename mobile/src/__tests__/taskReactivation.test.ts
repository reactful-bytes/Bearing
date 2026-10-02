import { describe, expect, it, jest } from '@jest/globals';

import {
  reactivateTaskAtomically,
  TaskReactivationStore,
  TaskReactivationTransaction,
} from '../features/tasks/taskReactivation';

function makeStore(task: { userId: string; status: 'active' | 'completed' } | null) {
  const reactivateTask = jest.fn();
  const transaction: TaskReactivationTransaction = {
    getTask: async () => task,
    reactivateTask,
  };
  const store: TaskReactivationStore = {
    runTransaction: async (operation) => operation(transaction),
  };
  return { store, reactivateTask };
}

describe('reactivateTaskAtomically', () => {
  it('reactivates only a completed task owned by the requesting user', async () => {
    const { store, reactivateTask } = makeStore({ userId: 'user-1', status: 'completed' });
    const now = new Date('2026-10-01T12:00:00.000Z');

    await expect(reactivateTaskAtomically(store, 'user-1', 'task-1', () => now)).resolves.toBe(
      true,
    );
    expect(reactivateTask).toHaveBeenCalledWith('task-1', now);
  });

  it('does not write when the task is already active, missing, or owned by another user', async () => {
    for (const task of [
      { userId: 'user-1', status: 'active' as const },
      { userId: 'user-2', status: 'completed' as const },
      null,
    ]) {
      const { store, reactivateTask } = makeStore(task);
      await expect(reactivateTaskAtomically(store, 'user-1', 'task-1')).resolves.toBe(false);
      expect(reactivateTask).not.toHaveBeenCalled();
    }
  });
});
