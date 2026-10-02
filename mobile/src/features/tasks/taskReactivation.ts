import { TaskStatus } from './taskTypes';

type ReactivationTask = {
  userId: string;
  status: TaskStatus;
};

export type TaskReactivationTransaction = {
  getTask: (taskId: string) => Promise<ReactivationTask | null>;
  reactivateTask: (taskId: string, now: Date) => void;
};

export type TaskReactivationStore = {
  runTransaction: <Result>(
    operation: (transaction: TaskReactivationTransaction) => Promise<Result>,
  ) => Promise<Result>;
};

export async function reactivateTaskAtomically(
  store: TaskReactivationStore,
  userId: string,
  taskId: string,
  now: () => Date = () => new Date(),
): Promise<boolean> {
  return store.runTransaction(async (transaction) => {
    const task = await transaction.getTask(taskId);
    if (!task || task.userId !== userId || task.status !== 'completed') return false;
    transaction.reactivateTask(taskId, now());
    return true;
  });
}
