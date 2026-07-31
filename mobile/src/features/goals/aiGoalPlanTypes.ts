import { GoalSmartMeta } from './goalTypes';

export type AiGoalPlanInput = {
  title: string;
  description: string;
  targetDate: string;
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
};
