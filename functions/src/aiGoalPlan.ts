import { createHash, randomUUID } from "node:crypto";

import { HttpsError } from "firebase-functions/v2/https";

import {
  AiCreditOperationResult,
  runAiCreditOperation,
} from "./aiCreditOperations";
import { EntitlementLookup, requirePremiumCaller } from "./entitlement";
import {
  RevenueCatV2Config,
  createRevenueCatVirtualCurrencyTransaction,
  getRevenueCatVirtualCurrencyBalance,
} from "./revenueCatV2";
import { CallableIdentityRequest } from "./security";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_MILESTONES = 6;
const MAX_STEPS = 8;

export type GoalPlanInput = {
  title: string;
  description: string;
  targetDate: string;
};

export type GoalPlanPromptInput = GoalPlanInput & {
  planningStartDate: string;
};

export type GoalPlanDraft = {
  promptVersion: 1;
  smartMeta: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  milestones: Array<{
    title: string;
    description: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
    starter: string;
    targetDate: string;
  }>;
  timelineSummary: string;
};

export type GoalPlanRequest = CallableIdentityRequest & {
  data: unknown;
};

export type GoalPlanGenerator = (
  input: GoalPlanPromptInput,
) => Promise<unknown>;

export type MeteredGoalPlanDraft = GoalPlanDraft & {
  requestId: string;
  availableCredits: number;
};

export type GoalPlanCreditService = {
  run: (
    userId: string,
    requestId: string,
    inputFingerprint: string,
    generate: () => Promise<GoalPlanDraft>,
    now: Date,
  ) => Promise<AiCreditOperationResult<GoalPlanDraft>>;
  getBalance: (userId: string) => Promise<number>;
};

export function createRevenueCatGoalPlanCreditService(
  config: RevenueCatV2Config,
): GoalPlanCreditService {
  return {
    run: (userId, requestId, inputFingerprint, generate, now) =>
      runAiCreditOperation(
        userId,
        requestId,
        inputFingerprint,
        generate,
        {
          debit: (targetUserId, idempotencyKey) =>
            createRevenueCatVirtualCurrencyTransaction(
              targetUserId,
              "debit",
              idempotencyKey,
              config,
            ),
          refund: (targetUserId, idempotencyKey) =>
            createRevenueCatVirtualCurrencyTransaction(
              targetUserId,
              "refund",
              idempotencyKey,
              config,
            ),
        },
        undefined,
        now,
      ),
    getBalance: async (userId) =>
      (await getRevenueCatVirtualCurrencyBalance(userId, config)).balance,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireTrimmedString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} is invalid.`);
  }

  return value.trim();
}

function requireIsoDate(value: unknown, field: string): string {
  const date = requireTrimmedString(value, field, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`${field} is invalid.`);
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() + 1 !== Number(match[2]) ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    throw new Error(`${field} is invalid.`);
  }

  return date;
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseGoalPlanInput(data: unknown): GoalPlanInput {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Goal details are required.");
  }

  const input = data as Record<string, unknown>;

  try {
    return {
      title: requireTrimmedString(input.title, "title", MAX_TITLE_LENGTH),
      description:
        typeof input.description === "string"
          ? input.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
          : "",
      targetDate: requireIsoDate(input.targetDate, "targetDate"),
    };
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "Provide a goal name up to 120 characters and a valid target date.",
    );
  }
}

function getRequestId(data: unknown): string {
  const value =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).requestId
      : undefined;
  if (value === undefined) return randomUUID();
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new HttpsError(
      "invalid-argument",
      "AI planning request ID is invalid.",
    );
  }
  return value.toLowerCase();
}

function fingerprintGoalPlanInput(input: GoalPlanInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function validateGoalPlanDraft(
  value: unknown,
  latestTargetDate?: string,
  earliestExclusiveTargetDate?: string,
): GoalPlanDraft {
  if (!value || typeof value !== "object") {
    throw new Error("AI goal plan is not an object.");
  }

  const draft = value as Record<string, unknown>;
  const smartMeta = draft.smartMeta as Record<string, unknown> | undefined;
  const milestones = draft.milestones;
  const steps = draft.steps;

  if (!smartMeta || !Array.isArray(milestones) || !Array.isArray(steps)) {
    throw new Error("AI goal plan is incomplete.");
  }

  if (
    milestones.length === 0 ||
    milestones.length > MAX_MILESTONES ||
    steps.length === 0 ||
    steps.length > MAX_STEPS
  ) {
    throw new Error("AI goal plan exceeds item limits.");
  }

  return {
    promptVersion: 1,
    smartMeta: {
      specific: requireTrimmedString(smartMeta.specific, "specific", 240),
      measurable: requireTrimmedString(smartMeta.measurable, "measurable", 240),
      achievable: requireTrimmedString(smartMeta.achievable, "achievable", 240),
      relevant: requireTrimmedString(smartMeta.relevant, "relevant", 240),
      timeBound: requireTrimmedString(smartMeta.timeBound, "timeBound", 240),
    },
    milestones: milestones.map((item, index) => {
      const milestone = item as Record<string, unknown>;
      return {
        title: requireTrimmedString(
          milestone.title,
          `milestone ${index + 1} title`,
          120,
        ),
        description: requireTrimmedString(
          milestone.description,
          `milestone ${index + 1} description`,
          500,
        ),
      };
    }),
    steps: steps.map((item, index) => {
      const step = item as Record<string, unknown>;
      const targetDate = requireIsoDate(
        step.targetDate,
        `step ${index + 1} targetDate`,
      );

      if (latestTargetDate && targetDate > latestTargetDate) {
        throw new Error(
          `step ${index + 1} targetDate exceeds the goal target date.`,
        );
      }
      if (
        earliestExclusiveTargetDate &&
        targetDate <= earliestExclusiveTargetDate
      ) {
        throw new Error(
          `step ${index + 1} targetDate must be after the planning start date.`,
        );
      }

      return {
        title: requireTrimmedString(step.title, `step ${index + 1} title`, 120),
        description: requireTrimmedString(
          step.description,
          `step ${index + 1} description`,
          500,
        ),
        starter: requireTrimmedString(
          step.starter,
          `step ${index + 1} starter`,
          240,
        ),
        targetDate,
      };
    }),
    timelineSummary: requireTrimmedString(
      draft.timelineSummary,
      "timelineSummary",
      500,
    ),
  };
}

export async function generateGoalPlanDraft(
  request: GoalPlanRequest,
  generator: GoalPlanGenerator,
  entitlementLookup?: EntitlementLookup,
  creditService?: GoalPlanCreditService,
  now = new Date(),
): Promise<GoalPlanDraft | MeteredGoalPlanDraft> {
  const caller = await requirePremiumCaller(request, entitlementLookup);
  const input = parseGoalPlanInput(request.data);
  const planningStartDate = formatUtcDate(now);
  if (input.targetDate <= planningStartDate) {
    throw new HttpsError(
      "invalid-argument",
      "Goal target date must be in the future.",
    );
  }
  if (!creditService) {
    try {
      return validateGoalPlanDraft(
        await generator({ ...input, planningStartDate }),
        input.targetDate,
        planningStartDate,
      );
    } catch {
      throw new HttpsError(
        "internal",
        "A goal plan could not be generated. Try again or continue manually.",
      );
    }
  }

  const requestId = getRequestId(request.data);
  const fingerprint = fingerprintGoalPlanInput(input);
  try {
    const result = await creditService.run(
      caller.uid,
      requestId,
      fingerprint,
      async () =>
        validateGoalPlanDraft(
          await generator({ ...input, planningStartDate }),
          input.targetDate,
          planningStartDate,
        ),
      now,
    );
    const draft = validateGoalPlanDraft(
      result.draft,
      input.targetDate,
      planningStartDate,
    );
    return {
      ...draft,
      requestId,
      availableCredits: await creditService.getBalance(caller.uid),
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "A goal plan could not be generated. Try again or continue manually.",
    );
  }
}
