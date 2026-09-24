import { TaskRecord, CreateTaskInput } from '../tasks/taskTypes';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalSmartMeta = {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
};

export type GoalMilestone = {
  title: string;
  description: string;
};

export type GoalRecord = {
  id: string;
  userId: string;
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  status: GoalStatus;
  isAiAssisted: boolean;
  aiPlanVersion: number | null;
  aiMilestones?: GoalMilestone[];
  createdAt: Date;
  updatedAt: Date;
};

export type GoalWithTasks = GoalRecord & {
  tasks: TaskRecord[];
  nextTask: TaskRecord | null;
  completedTaskCount: number;
  totalTaskCount: number;
  progressText: string;
};

export type CreateGoalInput = {
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  isAiAssisted: boolean;
  aiPlanVersion?: number | null;
  aiMilestones?: GoalMilestone[];
  tasks: CreateTaskInput[];
};

export type UpdateGoalInput = Partial<
  Pick<GoalRecord, 'title' | 'description' | 'smartMeta' | 'estimatedCompletionDate' | 'status'>
>;

export type GoalUiState = 'loading' | 'error' | 'empty' | 'ready';
