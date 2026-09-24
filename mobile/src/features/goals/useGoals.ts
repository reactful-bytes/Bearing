import { useCallback, useEffect, useMemo, useState } from 'react';

import { composeGoalWithTasks, deriveGoalStatus } from './goalHelpers';
import {
  CreateGoalInput,
  GoalRecord,
  GoalUiState,
  GoalWithTasks,
  UpdateGoalInput,
} from './goalTypes';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  createGoal as createFirebaseGoal,
  markGoalCompleted as markFirebaseGoalCompleted,
  subscribeToGoalTasks,
  subscribeToGoals,
  updateGoal as updateFirebaseGoal,
} from '../../services/firebase/firebaseGoals';
import { TaskRecord } from '../tasks/taskTypes';

type GoalSubscriptionCache = {
  goals: GoalRecord[];
  tasks: TaskRecord[];
  uiState: GoalUiState;
};

const goalSubscriptionCache = new Map<string, GoalSubscriptionCache>();

function sortGoals(goals: GoalWithTasks[]): GoalWithTasks[] {
  const statusWeight: Record<GoalRecord['status'], number> = {
    active: 0,
    completed: 1,
    archived: 2,
  };
  return [...goals].sort((left, right) => {
    const statusDifference = statusWeight[left.status] - statusWeight[right.status];
    if (statusDifference !== 0) return statusDifference;
    return left.estimatedCompletionDate.getTime() - right.estimatedCompletionDate.getTime();
  });
}

export type UseGoalsReturn = {
  goals: GoalWithTasks[];
  uiState: GoalUiState;
  createGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
  markGoalCompleted: (goalId: string) => Promise<void>;
  retry: () => void;
};

export function useGoals(): UseGoalsReturn {
  const userId = getFirebaseAuth().currentUser?.uid ?? null;
  const cached = userId ? goalSubscriptionCache.get(userId) : undefined;
  const hasCachedData = Boolean(cached);
  const [goals, setGoals] = useState<GoalRecord[]>(cached?.goals ?? []);
  const [tasks, setTasks] = useState<TaskRecord[]>(cached?.tasks ?? []);
  const [uiState, setUiState] = useState<GoalUiState>(cached?.uiState ?? 'loading');
  const [goalsLoaded, setGoalsLoaded] = useState(Boolean(cached));
  const [tasksLoaded, setTasksLoaded] = useState(Boolean(cached));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUiState('error');
      return;
    }
    if (!hasCachedData) setUiState('loading');
    setGoalsLoaded(false);
    setTasksLoaded(false);
    const unsubscribeGoals = subscribeToGoals(
      userId,
      (fetchedGoals) => {
        setGoals(fetchedGoals);
        setGoalsLoaded(true);
      },
      () => setUiState('error'),
    );
    const unsubscribeTasks = subscribeToGoalTasks(
      userId,
      (fetchedTasks) => {
        setTasks(fetchedTasks);
        setTasksLoaded(true);
      },
      () => setUiState('error'),
    );
    return () => {
      unsubscribeGoals();
      unsubscribeTasks();
    };
  }, [hasCachedData, revision, userId]);

  const retry = useCallback(() => {
    if (userId) goalSubscriptionCache.delete(userId);
    setUiState('loading');
    setRevision((current) => current + 1);
  }, [userId]);

  const goalMap = useMemo(
    () =>
      sortGoals(
        goals.map((goal) => {
          const goalTasks = tasks.filter((task) => task.goalId === goal.id);
          const rolledStatus = deriveGoalStatus(goal.status, goalTasks);
          return composeGoalWithTasks(
            rolledStatus === goal.status ? goal : { ...goal, status: rolledStatus },
            goalTasks,
          );
        }),
      ),
    [goals, tasks],
  );

  useEffect(() => {
    if (!goalsLoaded || !tasksLoaded) return;
    const nextUiState = goalMap.length === 0 ? 'empty' : 'ready';
    setUiState(nextUiState);
    if (userId) goalSubscriptionCache.set(userId, { goals, tasks, uiState: nextUiState });
  }, [goalMap.length, goals, goalsLoaded, tasks, tasksLoaded, userId]);

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<void> => {
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    if (!currentUserId) throw new Error('User is not authenticated.');
    await createFirebaseGoal(currentUserId, input);
  }, []);

  const updateGoal = useCallback(async (goalId: string, fields: UpdateGoalInput): Promise<void> => {
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    if (!currentUserId) throw new Error('User is not authenticated.');
    await updateFirebaseGoal(currentUserId, goalId, fields);
  }, []);

  const markGoalCompleted = useCallback(async (goalId: string): Promise<void> => {
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    if (!currentUserId) throw new Error('User is not authenticated.');
    await markFirebaseGoalCompleted(currentUserId, goalId);
  }, []);

  return { goals: goalMap, uiState, createGoal, updateGoal, markGoalCompleted, retry };
}
