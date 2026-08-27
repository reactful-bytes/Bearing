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

export type AiGoalMilestone = {
  title: string;
  description: string;
};

export type AiGoalPlanDraft = {
  promptVersion: number;
  smartMeta: GoalSmartMeta;
  milestones: AiGoalMilestone[];
  steps: {
    title: string;
    description: string;
    starter: string;
    targetDate: string;
  }[];
  timelineSummary: string;
  requestId?: string;
  availableCredits?: number;
};
