import { TaskRecord } from '../tasks/taskTypes';
import { GoalRecord, GoalStatus, GoalWithTasks } from './goalTypes';

function isIncompleteTask(task: TaskRecord): boolean {
  return task.status !== 'completed';
}

export function sortGoalTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export function normalizeGoalTasks(tasks: TaskRecord[]): TaskRecord[] {
  return sortGoalTasks(tasks).map((task, index) => ({ ...task, order: index }));
}

export function getFirstIncompleteTask(tasks: TaskRecord[]): TaskRecord | null {
  return sortGoalTasks(tasks).find(isIncompleteTask) ?? null;
}

export function countCompletedTasks(tasks: TaskRecord[]): number {
  return tasks.filter((task) => task.status === 'completed').length;
}

export function buildGoalProgressText(tasks: TaskRecord[]): string {
  if (tasks.length === 0) return 'No tasks yet';
  return `${countCompletedTasks(tasks)} of ${tasks.length} tasks completed`;
}

export function deriveGoalStatus(currentStatus: GoalStatus, tasks: TaskRecord[]): GoalStatus {
  if (currentStatus === 'archived' || currentStatus === 'completed') return currentStatus;
  if (tasks.length > 0 && tasks.every((task) => task.status === 'completed')) return 'completed';
  return 'active';
}

export function composeGoalWithTasks(goal: GoalRecord, tasks: TaskRecord[]): GoalWithTasks {
  const orderedTasks = normalizeGoalTasks(tasks);
  const nextTask = goal.status === 'completed' ? null : getFirstIncompleteTask(orderedTasks);

  return {
    ...goal,
    tasks: orderedTasks,
    nextTask,
    completedTaskCount: countCompletedTasks(orderedTasks),
    totalTaskCount: orderedTasks.length,
    progressText: buildGoalProgressText(orderedTasks),
  };
}
