import { GoalSmartMeta } from './goalTypes';

export const AI_GOAL_PLAN_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
} as const;

export type AiGoalPlanProvider =
  (typeof AI_GOAL_PLAN_PROVIDERS)[keyof typeof AI_GOAL_PLAN_PROVIDERS];

export const DEFAULT_AI_GOAL_PLAN_PROVIDER: AiGoalPlanProvider = AI_GOAL_PLAN_PROVIDERS.OPENAI;

export function shouldShowAiGoalPlanProviderSelector(
  isDevelopmentBuild: boolean,
  appEnvironment: string | undefined,
): boolean {
  return isDevelopmentBuild && appEnvironment === 'development';
}

export type AiGoalPlanInput = {
  title: string;
  description: string;
  targetDate: string;
  goalId?: string;
  timezone?: string;
  provider?: AiGoalPlanProvider;
  requestId?: string;
};

export type AiCreditStatus = {
  eligible: boolean;
  availableCredits: number;
};

export type AiGoalTask = {
  id?: string;
  title: string;
  description: string;
  starter: string;
  targetDate: string;
};

export type AiGoalMilestone = {
  id?: string;
  title: string;
  description: string;
  targetDate: string;
  tasks: AiGoalTask[];
};

export type AiGoalPlanDraft = {
  promptVersion: number;
  goalId?: string;
  smartMeta: GoalSmartMeta;
  milestones: AiGoalMilestone[];
  timelineSummary: string;
  requestId?: string;
  availableCredits?: number;
};
