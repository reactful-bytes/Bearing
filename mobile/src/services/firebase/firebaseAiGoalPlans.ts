import { httpsCallable } from 'firebase/functions';

import { AiGoalPlanDraft, AiGoalPlanInput } from '../../features/goals/aiGoalPlanTypes';
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
