export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalStepStatus = 'pending' | 'in_progress' | 'completed';

export type GoalSmartMeta = {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
};

export type GoalRecord = {
  id: string;
  userId: string;
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  nextStepId: string | null;
  status: GoalStatus;
  isAiAssisted: boolean;
  aiPlanVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalStepRecord = {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description: string;
  starter: string;
  estimatedFinishDate: Date | null;
  order: number;
  status: GoalStepStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalWithSteps = GoalRecord & {
  steps: GoalStepRecord[];
  nextStep: GoalStepRecord | null;
  completedStepCount: number;
  totalStepCount: number;
  progressText: string;
};

export type CreateGoalStepInput = {
  title: string;
  description: string;
  starter: string;
  estimatedFinishDate: Date | null;
};

export type CreateGoalInput = {
  title: string;
  description: string;
  smartMeta: GoalSmartMeta;
  estimatedCompletionDate: Date;
  isAiAssisted: boolean;
  steps: CreateGoalStepInput[];
};

export type UpdateGoalInput = Partial<
  Pick<GoalRecord, 'title' | 'description' | 'smartMeta' | 'estimatedCompletionDate' | 'status'>
>;

export type UpdateGoalStepInput = Partial<
  Pick<
    GoalStepRecord,
    'title' | 'description' | 'starter' | 'estimatedFinishDate' | 'order' | 'status'
  >
>;

export type GoalUiState = 'loading' | 'error' | 'empty' | 'ready';
