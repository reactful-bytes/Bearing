import { httpsCallable } from 'firebase/functions';

import { AiGoalPlanDraft, AiGoalPlanInput } from '../../features/goals/aiGoalPlanTypes';
import { getFirebaseFunctions } from './firebaseFunctions';

export async function generateAiGoalPlanDraft(input: AiGoalPlanInput): Promise<AiGoalPlanDraft> {
  const generateDraft = httpsCallable<AiGoalPlanInput, AiGoalPlanDraft>(
    getFirebaseFunctions(),
    'generateGoalPlanDraft',
    { timeout: 50_000 },
  );
  const result = await generateDraft(input);

  return result.data;
}
