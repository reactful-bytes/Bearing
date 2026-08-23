import { httpsCallable } from 'firebase/functions';

import {
  AiCreditStatus,
  AiGoalPlanDraft,
  AiGoalPlanInput,
} from '../../features/goals/aiGoalPlanTypes';
import { recordTelemetryEvent } from '../telemetry/telemetry';
import { getFirebaseFunctions } from './firebaseFunctions';

export async function generateAiGoalPlanDraft(input: AiGoalPlanInput): Promise<AiGoalPlanDraft> {
  const generateDraft = httpsCallable<AiGoalPlanInput, AiGoalPlanDraft>(
    getFirebaseFunctions(),
    'generateGoalPlanDraft',
    { timeout: 50_000 },
  );
  try {
    const result = await generateDraft(input);
    void recordTelemetryEvent('ai_goal_plan_result', { outcome: 'success' });
    return result.data;
  } catch (error) {
    void recordTelemetryEvent('ai_goal_plan_result', { outcome: 'failure' });
    throw error;
  }
}

export async function getAiCreditStatus(): Promise<AiCreditStatus> {
  const getStatus = httpsCallable<Record<string, never>, AiCreditStatus>(
    getFirebaseFunctions(),
    'getAiCreditStatus',
    { timeout: 20_000 },
  );
  const result = await getStatus({});
  return result.data;
}

export function getAiPlanningErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return null;
  }
  return code.startsWith('functions/') ? code.slice('functions/'.length) : code;
}
