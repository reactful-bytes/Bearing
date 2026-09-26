import type { TaskRecord } from '../tasks/taskTypes';
import {
  GoalMilestoneRecord,
  GoalMilestoneStatus,
  GoalRecord,
  GoalStatus,
  GoalWithMilestones,
} from './goalTypes';

export function sortGoalMilestones(milestones: GoalMilestoneRecord[]): GoalMilestoneRecord[] {
  return [...milestones].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export function normalizeGoalMilestones(milestones: GoalMilestoneRecord[]): GoalMilestoneRecord[] {
  return sortGoalMilestones(milestones).map((milestone, index) => ({ ...milestone, order: index }));
}

export function sortGoalTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((left, right) => {
    if (left.dueDate && right.dueDate && left.dueDate.getTime() !== right.dueDate.getTime()) {
      return left.dueDate.getTime() - right.dueDate.getTime();
    }
    if (left.dueDate && !right.dueDate) return -1;
    if (!left.dueDate && right.dueDate) return 1;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export function deriveMilestoneStatus(
  milestone: Pick<GoalMilestoneRecord, 'manuallyCompletedAt'>,
  tasks: TaskRecord[],
): GoalMilestoneStatus {
  if (milestone.manuallyCompletedAt) return 'completed';
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  if (tasks.length > 0 && completedCount === tasks.length) return 'completed';
  if (completedCount > 0) return 'in_progress';
  return 'pending';
}

export function deriveGoalStatus(
  goal: GoalRecord,
  milestones: (Pick<GoalMilestoneRecord, 'id' | 'manuallyCompletedAt'> & {
    status?: GoalMilestoneStatus;
  })[],
  tasksByMilestoneId: ReadonlyMap<string, TaskRecord[]>,
): GoalStatus {
  if (goal.status === 'archived') return 'archived';
  if (goal.manuallyCompletedAt) return 'completed';
  if (
    milestones.length > 0 &&
    milestones.every(
      (milestone) =>
        (milestone.status ??
          deriveMilestoneStatus(milestone, tasksByMilestoneId.get(milestone.id) ?? [])) ===
        'completed',
    )
  ) {
    return 'completed';
  }
  return 'active';
}

export function composeGoalWithMilestones(
  goal: GoalRecord,
  milestones: GoalMilestoneRecord[],
  allTasks: TaskRecord[],
): GoalWithMilestones {
  const goalTasks = sortGoalTasks(allTasks.filter((task) => task.goalId === goal.id));
  const orderedMilestones = normalizeGoalMilestones(milestones).map((milestone) => {
    const tasks = sortGoalTasks(goalTasks.filter((task) => task.milestoneId === milestone.id));
    const completedTaskCount = tasks.filter((task) => task.status === 'completed').length;
    const progressPercent =
      tasks.length === 0 ? 0 : Math.round((completedTaskCount / tasks.length) * 100);
    return {
      ...milestone,
      tasks,
      status: deriveMilestoneStatus(milestone, tasks),
      completedTaskCount,
      totalTaskCount: tasks.length,
      progressPercent,
      progressText: `${completedTaskCount} of ${tasks.length} tasks`,
    };
  });
  const tasksByMilestoneId = new Map(
    orderedMilestones.map((milestone) => [milestone.id, milestone.tasks]),
  );
  const status = deriveGoalStatus(goal, orderedMilestones, tasksByMilestoneId);
  const completedTaskCount = goalTasks.filter((task) => task.status === 'completed').length;
  const completedMilestoneCount = orderedMilestones.filter(
    (milestone) => milestone.status === 'completed',
  ).length;
  const totalMilestoneCount = orderedMilestones.length;
  const nextMilestone =
    status === 'completed'
      ? null
      : (orderedMilestones.find((milestone) => milestone.status !== 'completed') ?? null);
  const nextTask = goalTasks.find((task) => task.status === 'active') ?? null;

  return {
    ...goal,
    status,
    milestones: orderedMilestones,
    tasks: goalTasks,
    nextMilestone,
    nextTask,
    completedTaskCount,
    totalTaskCount: goalTasks.length,
    completedMilestoneCount,
    totalMilestoneCount,
    progressText:
      totalMilestoneCount === 0
        ? 'No milestones yet'
        : `${completedMilestoneCount} of ${totalMilestoneCount} milestones complete`,
  };
}
