import { GoalSmartMeta } from './goalTypes';

export type AiGoalPlanInput = {
  title: string;
  description: string;
  targetDate: string;
  requestId?: string;
};

export type AiCreditStatus = {
  eligible: boolean;
  availableCredits: number;
};

export type AiGoalTask = {
  title: string;
  description: string;
  starter: string;
  targetDate: string;
};

export type AiGoalMilestone = {
  title: string;
  description: string;
  targetDate: string;
  tasks: AiGoalTask[];
};

export type AiGoalPlanDraft = {
  promptVersion: number;
  smartMeta: GoalSmartMeta;
  milestones: AiGoalMilestone[];
  timelineSummary: string;
  requestId?: string;
  availableCredits?: number;
};
