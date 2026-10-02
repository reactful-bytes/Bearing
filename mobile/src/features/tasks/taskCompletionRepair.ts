import { TaskCompletionSource, TaskStatus } from './taskTypes';

export type LegacyTaskCompletionSource = Extract<TaskCompletionSource, 'scheduled' | 'start_now'>;

type LegacyTaskCompletionCandidate = {
  userId: string;
  status: TaskStatus;
  completionSource: TaskCompletionSource | null;
};

export type TaskCompletionRepairTransaction = {
  getTask: (taskId: string) => Promise<LegacyTaskCompletionCandidate | null>;
  reactivateTask: (taskId: string, now: Date) => void;
};

export type TaskCompletionRepairStore = {
  runTransaction: <Result>(
    operation: (transaction: TaskCompletionRepairTransaction) => Promise<Result>,
  ) => Promise<Result>;
};

export function getLegacyTaskCompletionSource(
  status: unknown,
  completionSource: unknown,
): LegacyTaskCompletionSource | null {
  if (status !== 'completed') return null;
  if (completionSource === 'scheduled' || completionSource === 'start_now') {
    return completionSource;
  }
  return null;
}

export async function repairLegacyTaskCompletionAtomically(
  store: TaskCompletionRepairStore,
  userId: string,
  taskId: string,
  expectedSource: LegacyTaskCompletionSource,
  now: () => Date = () => new Date(),
): Promise<boolean> {
  return store.runTransaction(async (transaction) => {
    const task = await transaction.getTask(taskId);
    if (
      !task ||
      task.userId !== userId ||
      task.status !== 'completed' ||
      task.completionSource !== expectedSource
    ) {
      return false;
    }

    transaction.reactivateTask(taskId, now());
    return true;
  });
}
