import { useCallback, useEffect, useMemo, useState } from 'react';

import { composeGoalWithMilestones, sortGoalMilestones } from './goalHelpers';
import {
  CreateGoalInput,
  CreateGoalMilestoneInput,
  GoalDraftSaveInput,
  GoalDraftSaveResult,
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
  activateGoalDraft as activateFirebaseGoalDraft,
  createGoal as createFirebaseGoal,
  createMilestone as createFirebaseMilestone,
  deleteGoal as deleteFirebaseGoal,
  deleteMilestone as deleteFirebaseMilestone,
  reorderMilestones as reorderFirebaseMilestones,
  setGoalManuallyCompleted as setFirebaseGoalManuallyCompleted,
  setMilestoneManuallyCompleted as setFirebaseMilestoneManuallyCompleted,
  saveGoalDraft as saveFirebaseGoalDraft,
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
    draft: 0,
    active: 1,
    completed: 2,
    archived: 3,
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
  createGoalDraft?: (input: CreateGoalInput) => Promise<string>;
  saveGoalDraft?: (goalId: string, input: GoalDraftSaveInput) => Promise<GoalDraftSaveResult>;
  activateGoalDraft?: (goalId: string) => Promise<void>;
  updateGoal: (goalId: string, fields: UpdateGoalInput) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  setGoalManuallyCompleted: (goalId: string, completed: boolean) => Promise<void>;
  createMilestone: (
    goalId: string,
    input: Omit<CreateGoalMilestoneInput, 'tasks'>,
  ) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  updateMilestone: (milestoneId: string, fields: UpdateGoalMilestoneInput) => Promise<void>;
  /** @deprecated Milestone completion is derived from tasks. */
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

  const createGoalDraft = useCallback(
    async (input: CreateGoalInput): Promise<string> =>
      createFirebaseGoal(requireUserId(), { ...input, status: 'draft' }),
    [],
  );

  const saveGoalDraft = useCallback(
    (goalId: string, input: GoalDraftSaveInput): Promise<GoalDraftSaveResult> =>
      saveFirebaseGoalDraft(requireUserId(), goalId, input),
    [],
  );

  const activateGoalDraft = useCallback(async (goalId: string): Promise<void> => {
    await activateFirebaseGoalDraft(requireUserId(), goalId);
  }, []);

  const updateGoal = useCallback(async (goalId: string, fields: UpdateGoalInput): Promise<void> => {
    await updateFirebaseGoal(requireUserId(), goalId, fields);
  }, []);

  const setGoalManuallyCompleted = useCallback(
    async (goalId: string, completed: boolean): Promise<void> => {
      const currentUserId = requireUserId();
      const goal = goalMap.find((candidate) => candidate.id === goalId);
      if (!goal) throw new Error('Goal not found.');
      if (
        !completed &&
        goal.milestones.length > 0 &&
        goal.milestones.every((milestone) => milestone.status === 'completed')
      ) {
        throw new Error('Uncomplete a task or add a new milestone before uncompleting this goal.');
      }
      await setFirebaseGoalManuallyCompleted(currentUserId, goalId, completed);
    },
    [goalMap],
  );

  const deleteGoal = useCallback(async (goalId: string): Promise<void> => {
    await deleteFirebaseGoal(requireUserId(), goalId);
  }, []);

  const createMilestone = useCallback(
    async (goalId: string, input: Omit<CreateGoalMilestoneInput, 'tasks'>): Promise<void> => {
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
    createGoalDraft,
    saveGoalDraft,
    activateGoalDraft,
    updateGoal,
    deleteGoal,
    setGoalManuallyCompleted,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    setMilestoneManuallyCompleted,
    reorderMilestones,
    retry,
  };
}
