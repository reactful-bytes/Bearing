import OpenAI from "openai";
import { logger } from "firebase-functions/logger";

import {
  GoalPlanGenerationContext,
  GoalPlanGenerator,
  GoalPlanPrompt,
} from "./aiGoalPlan";
import { GOAL_PLAN_DRAFT_SCHEMA } from "./goalPlanDraftSchema";

export const OPENAI_GOAL_PLAN_MODEL = "gpt-6-luna";
const OPENAI_REQUEST_TIMEOUT_MS = 90_000;
const OPENAI_MAX_OUTPUT_TOKENS = 50_000;

type OpenAiGoalPlanResponse = {
  output_text?: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
};

export class OpenAiGoalPlanOutputError extends Error {
  readonly code = "openai_output_invalid";
  readonly responseCharacters: number;

  constructor(
    message: string,
    responseCharacters: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OpenAiGoalPlanOutputError";
    this.responseCharacters = responseCharacters;
  }
}

export function parseOpenAiGoalPlanResponse(
  response: OpenAiGoalPlanResponse,
): unknown {
  const text = response.output_text ?? "";
  if (response.status === "incomplete") {
    throw new OpenAiGoalPlanOutputError(
      `OpenAI returned an incomplete goal plan (${response.incomplete_details?.reason ?? "unknown"}).`,
      text.length,
    );
  }
  if (!text.trim()) {
    throw new OpenAiGoalPlanOutputError(
      "OpenAI returned no goal-plan text.",
      text.length,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new OpenAiGoalPlanOutputError(
      "OpenAI returned goal-plan text that is not valid JSON.",
      text.length,
      { cause: error },
    );
  }
}

type OpenAiGoalPlanRequest = (
  model: string,
  prompt: GoalPlanPrompt,
) => Promise<OpenAiGoalPlanResponse>;

function getOpenAiErrorFields(error: unknown): Record<string, string | number> {
  const fields: Record<string, string | number> = {
    errorType: error instanceof Error ? error.name : "unknown",
  };
  if (!error || typeof error !== "object") return fields;

  const details = error as { status?: unknown; code?: unknown };
  if (
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
  ) {
    fields.httpStatus = details.status;
  }
  if (
    typeof details.code === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(details.code)
  ) {
    fields.errorCode = details.code;
  }
  return fields;
}

export function createOpenAiGoalPlanGeneratorWithRequest(
  request: OpenAiGoalPlanRequest,
): GoalPlanGenerator {
  return async (prompt, context?: GoalPlanGenerationContext) => {
    const requestId = context?.requestId ?? "untracked";
    const startedAt = Date.now();
    logger.info("ai_goal_plan_provider_attempt_started", {
      requestId,
      provider: "openai",
      model: OPENAI_GOAL_PLAN_MODEL,
      timeoutMs: OPENAI_REQUEST_TIMEOUT_MS,
    });
    try {
      const response = await request(OPENAI_GOAL_PLAN_MODEL, prompt);
      const draft = parseOpenAiGoalPlanResponse(response);
      logger.info("ai_goal_plan_provider_attempt_succeeded", {
        requestId,
        provider: "openai",
        model: OPENAI_GOAL_PLAN_MODEL,
        elapsedMs: Date.now() - startedAt,
        responseCharacters: (response.output_text ?? "").length,
      });
      return draft;
    } catch (error) {
      logger.warn("ai_goal_plan_provider_attempt_failed", {
        requestId,
        provider: "openai",
        model: OPENAI_GOAL_PLAN_MODEL,
        elapsedMs: Date.now() - startedAt,
        ...getOpenAiErrorFields(error),
      });
      throw error;
    }
  };
}

export function createOpenAiGoalPlanGenerator(
  apiKey: string,
): GoalPlanGenerator {
  let client: OpenAI | undefined;

  return createOpenAiGoalPlanGeneratorWithRequest(async (model, prompt) => {
    client ??= new OpenAI({
      apiKey,
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
    return client.responses.create({
      model,
      instructions: prompt.instructions,
      input: prompt.input,
      max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "goal_plan_draft",
          strict: true,
          schema: GOAL_PLAN_DRAFT_SCHEMA,
        },
      },
    });
  });
}
