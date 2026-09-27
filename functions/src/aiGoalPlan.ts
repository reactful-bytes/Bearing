import { createHash, randomUUID } from "node:crypto";

import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";

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
export const GOAL_PLAN_MAX_MILESTONES = 6;
export const GOAL_PLAN_MAX_TASKS = 36;

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
    targetDate: string;
    tasks: Array<{
      title: string;
      description: string;
      starter: string;
      targetDate: string;
    }>;
  }>;
  timelineSummary: string;
};

export type GoalPlanRequest = CallableIdentityRequest & {
  data: unknown;
};

export type GoalPlanGenerator = (
  input: GoalPlanPromptInput,
  context?: GoalPlanGenerationContext,
) => Promise<unknown>;

export type GoalPlanGenerationContext = {
  requestId: string;
};

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

  if (!smartMeta || !Array.isArray(milestones)) {
    throw new Error("AI goal plan is incomplete.");
  }

  if (milestones.length === 0 || milestones.length > GOAL_PLAN_MAX_MILESTONES) {
    throw new Error("AI goal plan exceeds item limits.");
  }

  let taskCount = 0;

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
      const targetDate = requireIsoDate(
        milestone.targetDate,
        `milestone ${index + 1} targetDate`,
      );
      if (latestTargetDate && targetDate > latestTargetDate) {
        throw new Error(
          `milestone ${index + 1} targetDate exceeds the goal target date.`,
        );
      }
      if (
        earliestExclusiveTargetDate &&
        targetDate <= earliestExclusiveTargetDate
      ) {
        throw new Error(
          `milestone ${index + 1} targetDate must be after the planning start date.`,
        );
      }
      if (!Array.isArray(milestone.tasks) || milestone.tasks.length === 0) {
        throw new Error(`milestone ${index + 1} has no actionable tasks.`);
      }
      taskCount += milestone.tasks.length;
      if (taskCount > GOAL_PLAN_MAX_TASKS) {
        throw new Error("AI goal plan exceeds item limits.");
      }
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
        targetDate,
        tasks: milestone.tasks.map((item, taskIndex) => {
          const task = item as Record<string, unknown>;
          const targetDate = requireIsoDate(
            task.targetDate,
            `milestone ${index + 1} task ${taskIndex + 1} targetDate`,
          );
          if (latestTargetDate && targetDate > latestTargetDate) {
            throw new Error(
              `milestone ${index + 1} task ${taskIndex + 1} targetDate exceeds the goal target date.`,
            );
          }
          if (
            earliestExclusiveTargetDate &&
            targetDate <= earliestExclusiveTargetDate
          ) {
            throw new Error(
              `milestone ${index + 1} task ${taskIndex + 1} targetDate must be after the planning start date.`,
            );
          }
          return {
            title: requireTrimmedString(
              task.title,
              `milestone ${index + 1} task ${taskIndex + 1} title`,
              120,
            ),
            description: requireTrimmedString(
              task.description,
              `milestone ${index + 1} task ${taskIndex + 1} description`,
              500,
            ),
            starter: requireTrimmedString(
              task.starter,
              `milestone ${index + 1} task ${taskIndex + 1} starter`,
              240,
            ),
            targetDate,
          };
        }),
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
  const caller = await requirePremiumCaller(request, entitlementLookup).catch(
    (error: unknown) => {
      if (error instanceof HttpsError) {
        logger.warn("ai_goal_plan_rejected", {
          code: error.code,
          stage: "entitlement",
        });
      }
      throw error;
    },
  );
  const input = parseGoalPlanInput(request.data);
  const planningStartDate = formatUtcDate(now);
  if (input.targetDate <= planningStartDate) {
    throw new HttpsError(
      "invalid-argument",
      "Goal target date must be in the future.",
    );
  }
  const requestId = creditService ? getRequestId(request.data) : randomUUID();
  const generationContext = { requestId };
  logger.info("ai_goal_plan_started", { requestId });
  if (!creditService) {
    let failureStage = "provider_generation";
    try {
      const generatedDraft = await generator(
        { ...input, planningStartDate },
        generationContext,
      );
      failureStage = "draft_validation";
      const draft = validateGoalPlanDraft(
        generatedDraft,
        input.targetDate,
        planningStartDate,
      );
      logger.info("ai_goal_plan_succeeded", { requestId });
      return draft;
    } catch (error) {
      logGoalPlanFailure(failureStage, error, requestId, [
        input.title,
        input.description,
      ]);
      throw new HttpsError(
        "internal",
        "A goal plan could not be generated. Try again or continue manually.",
      );
    }
  }

  const fingerprint = fingerprintGoalPlanInput(input);
  let failureStage = "credit_operation";
  try {
    const result = await creditService.run(
      caller.uid,
      requestId,
      fingerprint,
      async () => {
        failureStage = "provider_generation";
        const generatedDraft = await generator(
          { ...input, planningStartDate },
          generationContext,
        );
        failureStage = "draft_validation";
        return validateGoalPlanDraft(
          generatedDraft,
          input.targetDate,
          planningStartDate,
        );
      },
      now,
    );
    failureStage = "draft_validation";
    const draft = validateGoalPlanDraft(
      result.draft,
      input.targetDate,
      planningStartDate,
    );
    failureStage = "balance_lookup";
    const availableCredits = await creditService.getBalance(caller.uid);
    logger.info("ai_goal_plan_succeeded", { requestId });
    return {
      ...draft,
      requestId,
      availableCredits,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      const diagnostic = {
        ...getSafeErrorLogContext(error),
        code: error.code,
        requestId,
        stage: failureStage,
      };
      if (error.code === "internal" || error.code === "unavailable") {
        logger.error("ai_goal_plan_failed", diagnostic);
      } else {
        logger.warn("ai_goal_plan_rejected", diagnostic);
      }
      throw error;
    }
    logGoalPlanFailure(failureStage, error, requestId, [
      input.title,
      input.description,
    ]);
    throw new HttpsError(
      "internal",
      "A goal plan could not be generated. Try again or continue manually.",
    );
  }
}

function logGoalPlanFailure(
  stage: string,
  error: unknown,
  requestId: string,
  sensitiveValues: string[] = [],
): void {
  logger.error("ai_goal_plan_failed", {
    stage,
    requestId,
    ...getSafeErrorLogContext(error, sensitiveValues),
  });
}

function getSafeErrorLogContext(
  error: unknown,
  sensitiveValues: string[] = [],
): Record<string, string | number> {
  const context: Record<string, string | number> = {
    errorType: error instanceof Error ? error.name : "unknown",
  };
  if (!error || typeof error !== "object") return context;

  const details = error as {
    code?: unknown;
    status?: unknown;
    cause?: unknown;
    finishReason?: unknown;
    responseCharacters?: unknown;
  };
  if (
    typeof details.code === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(details.code)
  ) {
    context.errorCode = details.code;
  } else if (
    typeof details.code === "number" &&
    Number.isInteger(details.code)
  ) {
    context.errorCode = details.code;
  }
  if (
    typeof details.finishReason === "string" &&
    /^[A-Z_]{1,32}$/.test(details.finishReason)
  ) {
    context.providerFinishReason = details.finishReason;
  }
  if (
    typeof details.responseCharacters === "number" &&
    Number.isInteger(details.responseCharacters) &&
    details.responseCharacters >= 0
  ) {
    context.providerResponseCharacters = details.responseCharacters;
  }
  if (
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
  ) {
    context.httpStatus = details.status;
    if (error instanceof Error) {
      let diagnosticMessage = error.message;
      for (const value of sensitiveValues) {
        if (value) {
          diagnosticMessage = diagnosticMessage.split(value).join("[redacted]");
        }
      }
      diagnosticMessage = diagnosticMessage
        .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted-api-key]")
        .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
        .replace(
          /([?&](?:key|api[_-]?key|token|access_token)=)[^&\s]+/gi,
          "$1[redacted]",
        );
      context.providerMessage = diagnosticMessage.slice(0, 500);
    }
  }

  if (details.cause && typeof details.cause === "object") {
    const cause = details.cause as {
      name?: unknown;
      code?: unknown;
      status?: unknown;
    };
    if (
      typeof cause.name === "string" &&
      /^[a-zA-Z0-9_.-]{1,64}$/.test(cause.name)
    ) {
      context.causeType = cause.name;
    }
    if (
      typeof cause.code === "string" &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(cause.code)
    ) {
      context.causeCode = cause.code;
    } else if (typeof cause.code === "number" && Number.isInteger(cause.code)) {
      context.causeCode = cause.code;
    }
    if (
      typeof cause.status === "number" &&
      Number.isInteger(cause.status) &&
      cause.status >= 100 &&
      cause.status <= 599
    ) {
      context.causeHttpStatus = cause.status;
    }
  }

  return context;
}
