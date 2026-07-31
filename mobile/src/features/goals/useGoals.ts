import { useCallback, useEffect, useMemo, useState } from 'react';

import { composeGoalWithSteps, deriveGoalStatus, normalizeGoalSteps } from './goalHelpers';
import {
  CreateGoalInput,
  CreateGoalStepInput,
  GoalRecord,
  GoalStepRecord,
  GoalUiState,
  GoalWithSteps,
  UpdateGoalInput,
  UpdateGoalStepInput,
} from './goalTypes';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  createGoal as createFirebaseGoal,
  createGoalStep as createFirebaseGoalStep,
  deleteGoalStep as deleteFirebaseGoalStep,
  markGoalCompleted as markFirebaseGoalCompleted,
  reorderGoalSteps as reorderFirebaseGoalSteps,
  subscribeToGoals,
  subscribeToGoalSteps,
  updateGoal as updateFirebaseGoal,
  updateGoalStep as updateFirebaseGoalStep,
} from '../../services/firebase/firebaseGoals';

function sortGoals(goals: GoalWithSteps[]): GoalWithSteps[] {
  const statusWeight: Record<GoalRecord['status'], number> = {
    active: 0,
    completed: 1,
    archived: 2,
  };

  return [...goals].sort((left, right) => {
    const statusDifference = statusWeight[left.status] - statusWeight[right.status];
    if (statusDifference !== 0) {
      return statusDifference;
    }

    return left.estimatedCompletionDate.getTime() - right.estimatedCompletionDate.getTime();
  });
}

export type UseGoalsReturn = {
  goals: GoalWithSteps[];
  uiState: GoalUiState;
  createGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
  markGoalCompleted: (goalId: string) => Promise<void>;
  createStep: (goalId: string, input: CreateGoalStepInput) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  updateStep: (stepId: string, fields: UpdateGoalStepInput) => Promise<void>;
  reorderSteps: (goalId: string, orderedStepIds: string[]) => Promise<void>;
  retry: () => void;
};

export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [steps, setSteps] = useState<GoalStepRecord[]>([]);
  const [uiState, setUiState] = useState<GoalUiState>('loading');
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [stepsLoaded, setStepsLoaded] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const userId = getFirebaseAuth().currentUser?.uid;

    if (!userId) {
      setUiState('error');
      return;
    }

    setUiState('loading');
    setGoalsLoaded(false);
    setStepsLoaded(false);

    const unsubscribeGoals = subscribeToGoals(
      userId,
      (fetchedGoals) => {
        setGoals(fetchedGoals);
        setGoalsLoaded(true);
      },
      () => {
        setUiState('error');
      },
    );

    const unsubscribeSteps = subscribeToGoalSteps(
      userId,
      (fetchedSteps) => {
        setSteps(fetchedSteps);
        setStepsLoaded(true);
      },
      () => {
        setUiState('error');
      },
    );

    return () => {
      unsubscribeGoals();
      unsubscribeSteps();
    };
  }, [revision]);

  const retry = useCallback(() => {
    setUiState('loading');
    setRevision((current) => current + 1);
  }, []);

  const goalMap = useMemo(() => {
    const groupedSteps = new Map<string, GoalStepRecord[]>();

    steps.forEach((step) => {
      const existing = groupedSteps.get(step.goalId);
      if (existing) {
        existing.push(step);
        return;
      }

      groupedSteps.set(step.goalId, [step]);
    });

    return sortGoals(
      goals.map((goal) => {
        const goalSteps = groupedSteps.get(goal.id) ?? [];
        const rolledStatus = deriveGoalStatus(goal.status, goalSteps);

        return composeGoalWithSteps(
          rolledStatus === goal.status ? goal : { ...goal, status: rolledStatus },
          goalSteps,
        );
      }),
    );
  }, [goals, steps]);

  useEffect(() => {
    if (!goalsLoaded || !stepsLoaded) {
      return;
    }

    setUiState(goalMap.length === 0 ? 'empty' : 'ready');
  }, [goalMap.length, goalsLoaded, stepsLoaded]);

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await createFirebaseGoal(userId, input);
  }, []);

  const updateGoal = useCallback(async (goalId: string, fields: UpdateGoalInput): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await updateFirebaseGoal(userId, goalId, fields);
  }, []);

  const markGoalCompleted = useCallback(async (goalId: string): Promise<void> => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    await markFirebaseGoalCompleted(userId, goalId);
  }, []);

  const createStep = useCallback(
    async (goalId: string, input: CreateGoalStepInput): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      const goal = goalMap.find((entry) => entry.id === goalId);
      if (!goal) {
        throw new Error('Goal not found.');
      }

      await createFirebaseGoalStep(
        userId,
        goalId,
        input,
        goal.steps.length,
        goal.status,
        goal.nextStep?.id ?? null,
      );
    },
    [goalMap],
  );

  const deleteStep = useCallback(
    async (stepId: string): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      const targetStep = steps.find((step) => step.id === stepId);
      if (!targetStep) {
        throw new Error('Goal step not found.');
      }

      const targetGoal = goalMap.find((goal) => goal.id === targetStep.goalId);
      if (!targetGoal) {
        throw new Error('Goal not found.');
      }

      const remainingSteps = normalizeGoalSteps(
        targetGoal.steps.filter((step) => step.id !== stepId),
      );
      const nextGoalStatus = deriveGoalStatus(targetGoal.status, remainingSteps);
      const nextStep =
        nextGoalStatus === 'completed'
          ? null
          : composeGoalWithSteps({ ...targetGoal, status: nextGoalStatus }, remainingSteps)
              .nextStep;

      await deleteFirebaseGoalStep(
        userId,
        targetGoal.id,
        stepId,
        remainingSteps,
        nextGoalStatus,
        nextStep?.id ?? null,
      );
    },
    [goalMap, steps],
  );

  const updateStep = useCallback(
    async (stepId: string, fields: UpdateGoalStepInput): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      const targetStep = steps.find((step) => step.id === stepId);
      if (!targetStep) {
        throw new Error('Goal step not found.');
      }

      await updateFirebaseGoalStep(userId, targetStep.goalId, stepId, fields);
    },
    [steps],
  );

  const reorderSteps = useCallback(
    async (goalId: string, orderedStepIds: string[]): Promise<void> => {
      const userId = getFirebaseAuth().currentUser?.uid;
      if (!userId) {
        throw new Error('User is not authenticated.');
      }

      await reorderFirebaseGoalSteps(userId, goalId, orderedStepIds);
    },
    [],
  );

  return {
    goals: goalMap,
    uiState,
    createGoal,
    updateGoal,
    markGoalCompleted,
    createStep,
    deleteStep,
    updateStep,
    reorderSteps,
    retry,
  };
}
