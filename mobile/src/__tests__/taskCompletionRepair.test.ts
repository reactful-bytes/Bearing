import { describe, expect, it, jest } from '@jest/globals';

import {
  TaskCompletionRepairStore,
  TaskCompletionRepairTransaction,
  getLegacyTaskCompletionSource,
  repairLegacyTaskCompletionAtomically,
} from '../features/tasks/taskCompletionRepair';

describe('taskCompletionRepair', () => {
  it('identifies only scheduled and Start Now legacy completions', () => {
    expect(getLegacyTaskCompletionSource('completed', 'scheduled')).toBe('scheduled');
    expect(getLegacyTaskCompletionSource('completed', 'start_now')).toBe('start_now');
    expect(getLegacyTaskCompletionSource('completed', 'manual')).toBeNull();
    expect(getLegacyTaskCompletionSource('active', 'scheduled')).toBeNull();
  });

  it('reactivates a matching legacy completion transactionally', async () => {
    const reactivateTask = jest.fn<TaskCompletionRepairTransaction['reactivateTask']>();
    const store: TaskCompletionRepairStore = {
      runTransaction: (operation) =>
        operation({
          getTask: async () => ({
            userId: 'user-1',
            status: 'completed',
            completionSource: 'scheduled',
          }),
          reactivateTask,
        }),
    };

    await expect(
      repairLegacyTaskCompletionAtomically(
        store,
        'user-1',
        'task-1',
        'scheduled',
        () => new Date('2026-10-01T12:00:00.000Z'),
      ),
    ).resolves.toBe(true);
    expect(reactivateTask).toHaveBeenCalledWith('task-1', new Date('2026-10-01T12:00:00.000Z'));
  });

  const nonRepairableRows: [string, string, 'active' | 'completed', 'manual' | 'scheduled'][] = [
    ['manual completion', 'user-1', 'completed', 'manual'],
    ['another user task', 'user-2', 'completed', 'scheduled'],
    ['already active task', 'user-1', 'active', 'scheduled'],
  ];
  const nonRepairableCases: {
    description: string;
    userId: string;
    status: 'active' | 'completed';
    completionSource: 'manual' | 'scheduled';
  }[] = nonRepairableRows.map(([description, userId, status, completionSource]) => ({
    description,
    userId,
    status,
    completionSource,
  }));

  it.each(nonRepairableCases)(
    'does not repair $description',
    async ({ userId, status, completionSource }) => {
      const reactivateTask = jest.fn<TaskCompletionRepairTransaction['reactivateTask']>();
      const store: TaskCompletionRepairStore = {
        runTransaction: (operation) =>
          operation({
            getTask: async () => ({ userId, status, completionSource }),
            reactivateTask,
          }),
      };

      await expect(
        repairLegacyTaskCompletionAtomically(store, 'user-1', 'task-1', 'scheduled'),
      ).resolves.toBe(false);
      expect(reactivateTask).not.toHaveBeenCalled();
    },
  );
});
