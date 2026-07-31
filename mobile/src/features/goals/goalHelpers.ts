import { GoalRecord, GoalStatus, GoalStepRecord, GoalWithSteps } from './goalTypes';

function isIncompleteStep(step: GoalStepRecord): boolean {
  return step.status !== 'completed';
}

export function sortGoalSteps(steps: GoalStepRecord[]): GoalStepRecord[] {
  return [...steps].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export function normalizeGoalSteps(steps: GoalStepRecord[]): GoalStepRecord[] {
  return sortGoalSteps(steps).map((step, index) => ({
    ...step,
    order: index,
  }));
}

export function getFirstIncompleteStep(steps: GoalStepRecord[]): GoalStepRecord | null {
  const orderedSteps = sortGoalSteps(steps);
  return orderedSteps.find(isIncompleteStep) ?? null;
}

export function countCompletedSteps(steps: GoalStepRecord[]): number {
  return steps.filter((step) => step.status === 'completed').length;
}

export function buildGoalProgressText(steps: GoalStepRecord[]): string {
  if (steps.length === 0) {
    return 'No steps yet';
  }

  return `${countCompletedSteps(steps)} of ${steps.length} steps completed`;
}

export function deriveGoalStatus(currentStatus: GoalStatus, steps: GoalStepRecord[]): GoalStatus {
  if (currentStatus === 'archived' || currentStatus === 'completed') {
    return currentStatus;
  }

  if (steps.length > 0 && steps.every((step) => step.status === 'completed')) {
    return 'completed';
  }

  return 'active';
}

export function composeGoalWithSteps(goal: GoalRecord, steps: GoalStepRecord[]): GoalWithSteps {
  const orderedSteps = normalizeGoalSteps(steps);
  const nextStep = goal.status === 'completed' ? null : getFirstIncompleteStep(orderedSteps);

  return {
    ...goal,
    steps: orderedSteps,
    nextStep,
    completedStepCount: countCompletedSteps(orderedSteps),
    totalStepCount: orderedSteps.length,
    progressText: buildGoalProgressText(orderedSteps),
  };
}
