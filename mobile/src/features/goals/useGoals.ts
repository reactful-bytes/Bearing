import { useCallback, useEffect, useMemo, useState } from 'react';

import { composeGoalWithMilestones, sortGoalMilestones } from './goalHelpers';
import {
  CreateGoalInput,
  GoalMilestoneRecord,
  GoalRecord,
  GoalUiState,
  GoalWithMilestones,
  UpdateGoalInput,
  UpdateGoalMilestoneInput,
} from './goalTypes';
import { TaskRecord } from '../tasks/taskTypes';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  createGoal as createFirebaseGoal,
  createMilestone as createFirebaseMilestone,
  deleteMilestone as deleteFirebaseMilestone,
  reorderMilestones as reorderFirebaseMilestones,
  setGoalManuallyCompleted as setFirebaseGoalManuallyCompleted,
  setMilestoneManuallyCompleted as setFirebaseMilestoneManuallyCompleted,
  subscribeToGoals,
  subscribeToMilestones,
  updateGoal as updateFirebaseGoal,
  updateMilestone as updateFirebaseMilestone,
} from '../../services/firebase/firebaseGoals';
import { subscribeToTasks } from '../../services/firebase/firebaseTasks';

type GoalSubscriptionCache = {
  goals: GoalRecord[];
  milestones: GoalMilestoneRecord[];
  tasks: TaskRecord[];
  uiState: GoalUiState;
};

const goalSubscriptionCache = new Map<string, GoalSubscriptionCache>();

function sortGoals(goals: GoalWithMilestones[]): GoalWithMilestones[] {
  const statusWeight: Record<GoalRecord['status'], number> = {
    active: 0,
    completed: 1,
    archived: 2,
  };
  return [...goals].sort((left, right) => {
    const statusDifference = statusWeight[left.status] - statusWeight[right.status];
    return (
      statusDifference ||
      left.estimatedCompletionDate.getTime() - right.estimatedCompletionDate.getTime()
    );
  });
}

export type UseGoalsReturn = {
  goals: GoalWithMilestones[];
  uiState: GoalUiState;
  createGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
  setGoalManuallyCompleted: (goalId: string, completed: boolean) => Promise<void>;
  createMilestone: (goalId: string, input: { title: string; description: string }) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  updateMilestone: (milestoneId: string, fields: UpdateGoalMilestoneInput) => Promise<void>;
  setMilestoneManuallyCompleted: (milestoneId: string, completed: boolean) => Promise<void>;
  reorderMilestones: (goalId: string, orderedMilestoneIds: string[]) => Promise<void>;
  retry: () => void;
};

export function useGoals(): UseGoalsReturn {
  const userId = getFirebaseAuth().currentUser?.uid ?? null;
  const cached = userId ? goalSubscriptionCache.get(userId) : undefined;
  const [goals, setGoals] = useState<GoalRecord[]>(cached?.goals ?? []);
  const [milestones, setMilestones] = useState<GoalMilestoneRecord[]>(cached?.milestones ?? []);
  const [tasks, setTasks] = useState<TaskRecord[]>(cached?.tasks ?? []);
  const [uiState, setUiState] = useState<GoalUiState>(cached?.uiState ?? 'loading');
  const [goalsLoaded, setGoalsLoaded] = useState(Boolean(cached));
  const [milestonesLoaded, setMilestonesLoaded] = useState(Boolean(cached));
  const [tasksLoaded, setTasksLoaded] = useState(Boolean(cached));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUiState('error');
      return;
    }

    setUiState((current) => (current === 'ready' || current === 'empty' ? current : 'loading'));
    setGoalsLoaded(false);
    setMilestonesLoaded(false);
    setTasksLoaded(false);
    const handleError = () => setUiState('error');
    const unsubscribeGoals = subscribeToGoals(
      userId,
      (records) => {
        setGoals(records);
        setGoalsLoaded(true);
      },
      handleError,
    );
    const unsubscribeMilestones = subscribeToMilestones(
      userId,
      (records) => {
        setMilestones(records);
        setMilestonesLoaded(true);
      },
      handleError,
    );
    const unsubscribeTasks = subscribeToTasks(
      userId,
      (records) => {
        setTasks(records);
        setTasksLoaded(true);
      },
      handleError,
    );

    return () => {
      unsubscribeGoals();
      unsubscribeMilestones();
      unsubscribeTasks();
    };
  }, [revision, userId]);

  const retry = useCallback(() => {
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    if (currentUserId) goalSubscriptionCache.delete(currentUserId);
    setUiState('loading');
    setRevision((current) => current + 1);
  }, []);

  const goalMap = useMemo(() => {
    const groupedMilestones = new Map<string, GoalMilestoneRecord[]>();
    milestones.forEach((milestone) => {
      const existing = groupedMilestones.get(milestone.goalId) ?? [];
      existing.push(milestone);
      groupedMilestones.set(milestone.goalId, existing);
    });
    return sortGoals(
      goals.map((goal) =>
        composeGoalWithMilestones(
          goal,
          sortGoalMilestones(groupedMilestones.get(goal.id) ?? []),
          tasks,
        ),
      ),
    );
  }, [goals, milestones, tasks]);

  useEffect(() => {
    if (!goalsLoaded || !milestonesLoaded || !tasksLoaded) return;
    const nextUiState = goalMap.length === 0 ? 'empty' : 'ready';
    setUiState(nextUiState);
    if (userId)
      goalSubscriptionCache.set(userId, { goals, milestones, tasks, uiState: nextUiState });
  }, [
    goalMap.length,
    goals,
    goalsLoaded,
    milestones,
    milestonesLoaded,
    tasks,
    tasksLoaded,
    userId,
  ]);

  function requireUserId(): string {
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    if (!currentUserId) throw new Error('User is not authenticated.');
    return currentUserId;
  }

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<void> => {
    await createFirebaseGoal(requireUserId(), input);
  }, []);

  const updateGoal = useCallback(async (goalId: string, fields: UpdateGoalInput): Promise<void> => {
    await updateFirebaseGoal(requireUserId(), goalId, fields);
  }, []);

  const setGoalManuallyCompleted = useCallback(
    async (goalId: string, completed: boolean): Promise<void> => {
      await setFirebaseGoalManuallyCompleted(requireUserId(), goalId, completed);
    },
    [],
  );

  const createMilestone = useCallback(
    async (goalId: string, input: { title: string; description: string }): Promise<void> => {
      const goal = goalMap.find((entry) => entry.id === goalId);
      if (!goal) throw new Error('Goal not found.');
      await createFirebaseMilestone(requireUserId(), goalId, input, goal.milestones.length);
    },
    [goalMap],
  );

  const deleteMilestone = useCallback(async (milestoneId: string): Promise<void> => {
    await deleteFirebaseMilestone(requireUserId(), milestoneId);
  }, []);

  const updateMilestone = useCallback(
    async (milestoneId: string, fields: UpdateGoalMilestoneInput): Promise<void> => {
      await updateFirebaseMilestone(requireUserId(), milestoneId, fields);
    },
    [],
  );

  const setMilestoneManuallyCompleted = useCallback(
    async (milestoneId: string, completed: boolean): Promise<void> => {
      await setFirebaseMilestoneManuallyCompleted(requireUserId(), milestoneId, completed);
    },
    [],
  );

  const reorderMilestones = useCallback(
    async (goalId: string, orderedMilestoneIds: string[]): Promise<void> => {
      await reorderFirebaseMilestones(requireUserId(), goalId, orderedMilestoneIds);
    },
    [],
  );

  return {
    goals: goalMap,
    uiState,
    createGoal,
    updateGoal,
    setGoalManuallyCompleted,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    setMilestoneManuallyCompleted,
    reorderMilestones,
    retry,
  };
}
