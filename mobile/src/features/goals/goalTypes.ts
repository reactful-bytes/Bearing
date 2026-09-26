import type { TaskRecord } from '../tasks/taskTypes';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalMilestoneStatus = 'pending' | 'in_progress' | 'completed';

export type GoalSmartMeta = {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
};

export type GoalMilestoneDraft = {
  title: string;
  description: string;
  estimatedFinishDate: Date | null;
  tasks: GoalTaskInput[];
};

export type GoalTaskInput = {
  title: string;
  description: string;
  starter: string;
  dueDate: Date | null;
};

export type GoalMilestoneRecord = {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description: string;
  order: number;
  estimatedFinishDate: Date | null;
  manuallyCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalMilestoneWithTasks = GoalMilestoneRecord & {
  tasks: TaskRecord[];
  status: GoalMilestoneStatus;
  completedTaskCount: number;
  totalTaskCount: number;
  progressPercent: number;
  progressText: string;
};

export type GoalRecord = {
  id: string;
  userId: string;
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  nextMilestoneId: string | null;
  manuallyCompletedAt: Date | null;
  status: GoalStatus;
  isAiAssisted: boolean;
  aiPlanVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalWithMilestones = GoalRecord & {
  milestones: GoalMilestoneWithTasks[];
  tasks: TaskRecord[];
  nextMilestone: GoalMilestoneWithTasks | null;
  nextTask: TaskRecord | null;
  completedTaskCount: number;
  totalTaskCount: number;
  completedMilestoneCount: number;
  totalMilestoneCount: number;
  progressText: string;
};

export type CreateGoalMilestoneInput = {
  title: string;
  description: string;
  estimatedFinishDate: Date | null;
  tasks: GoalTaskInput[];
};

export type CreateGoalInput = {
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  isAiAssisted: boolean;
  aiPlanVersion?: number | null;
  milestones: CreateGoalMilestoneInput[];
  tasks?: GoalTaskInput[];
};

export type UpdateGoalInput = Partial<
  Pick<GoalRecord, 'title' | 'description' | 'smartMeta' | 'estimatedCompletionDate' | 'status'>
>;

export type UpdateGoalMilestoneInput = Partial<
  Pick<GoalMilestoneRecord, 'title' | 'description' | 'order' | 'estimatedFinishDate'>
>;

export type GoalUiState = 'loading' | 'error' | 'empty' | 'ready';
