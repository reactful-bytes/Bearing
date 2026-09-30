import { logger } from "firebase-functions/logger";

import {
  GoalPlanDraft,
  GoalPlanGenerationContext,
  GoalPlanGenerator,
  GoalPlanPrompt,
} from "./aiGoalPlan";
import { GOAL_PLAN_DRAFT_SCHEMA } from "./goalPlanDraftSchema";

export const GEMINI_GOAL_PLAN_MODEL = "gemini-3.6-flash";
export const GEMINI_GOAL_PLAN_FALLBACK_MODEL = "gemini-3.5-flash";

const GEMINI_REQUEST_TIMEOUT_MS = 45_000;
const GEMINI_PROVIDER_BUDGET_MS = 100_000;
const GEMINI_MODEL_FALLBACK_DELAY_MS = 1_000;
const GEMINI_RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

type GeminiGoalPlanResponse = {
  text?: string;
  candidates?: Array<{ finishReason?: unknown }>;
};

export class GeminiGoalPlanOutputError extends Error {
  readonly code = "gemini_output_invalid";
  readonly finishReason: string;
  readonly responseCharacters: number;

  constructor(
    message: string,
    finishReason: string,
    responseCharacters: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GeminiGoalPlanOutputError";
    this.finishReason = finishReason;
    this.responseCharacters = responseCharacters;
  }
}

export function parseGeminiGoalPlanResponse(
  response: GeminiGoalPlanResponse,
): Omit<GoalPlanDraft, "promptVersion"> {
  const text = response.text ?? "";
  const finishReason = String(
    response.candidates?.[0]?.finishReason ?? "UNKNOWN",
  );

  if (!text.trim()) {
    throw new GeminiGoalPlanOutputError(
      finishReason === "MAX_TOKENS"
        ? "Gemini reached its output token limit without returning goal-plan text."
        : "Gemini returned no goal-plan text.",
      finishReason,
      text.length,
    );
  }

  try {
    return JSON.parse(text) as Omit<GoalPlanDraft, "promptVersion">;
  } catch (error) {
    throw new GeminiGoalPlanOutputError(
      finishReason === "MAX_TOKENS"
        ? "Gemini reached its output token limit before returning complete valid JSON."
        : "Gemini returned goal-plan text that is not complete valid JSON.",
      finishReason,
      text.length,
      { cause: error },
    );
  }
}

type GeminiGoalPlanRequest = (
  model: string,
  prompt: GoalPlanPrompt,
  timeoutMs: number,
) => Promise<GeminiGoalPlanResponse>;

type GeminiGoalPlanLog = (
  event: string,
  fields: Record<string, string | number>,
) => void;

type GeminiGoalPlanPhase = "primary" | "fallback";

const logGeminiGoalPlanEvent: GeminiGoalPlanLog = (event, fields) => {
  if (event.endsWith("failed") || event.endsWith("exhausted")) {
    logger.warn(event, fields);
    return;
  }
  logger.info(event, fields);
};

function getGeminiErrorFields(error: unknown): Record<string, string | number> {
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
  } else if (
    typeof details.code === "number" &&
    Number.isInteger(details.code)
  ) {
    fields.errorCode = details.code;
  }
  return fields;
}

function getFinishReason(response: GeminiGoalPlanResponse): string {
  const finishReason = String(
    response.candidates?.[0]?.finishReason ?? "UNKNOWN",
  );
  return /^[A-Z_]{1,32}$/.test(finishReason) ? finishReason : "UNKNOWN";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableGeminiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: unknown }).status;
  return (
    typeof status === "number" && GEMINI_RETRYABLE_STATUS_CODES.includes(status)
  );
}

export function createGeminiGoalPlanGeneratorWithRequest(
  request: GeminiGoalPlanRequest,
  log: GeminiGoalPlanLog = logGeminiGoalPlanEvent,
  delay: (milliseconds: number) => Promise<void> = wait,
): GoalPlanGenerator {
  return async (prompt, context?: GoalPlanGenerationContext) => {
    const requestId = context?.requestId ?? "untracked";
    const providerDeadline = Date.now() + GEMINI_PROVIDER_BUDGET_MS;
    const requestModel = async (
      model: string,
      phase: GeminiGoalPlanPhase,
    ): Promise<GeminiGoalPlanResponse> => {
      const remainingBudgetMs = providerDeadline - Date.now();
      if (remainingBudgetMs < GEMINI_REQUEST_TIMEOUT_MS) {
        log("ai_goal_plan_provider_budget_exhausted", {
          requestId,
          provider: "gemini",
          model,
          phase,
          attempt: 1,
          maxAttempts: 1,
          budgetMs: GEMINI_PROVIDER_BUDGET_MS,
        });
        throw new Error("Gemini provider time budget exhausted.");
      }
      const timeoutMs = Math.min(GEMINI_REQUEST_TIMEOUT_MS, remainingBudgetMs);
      const startedAt = Date.now();
      const attemptFields = {
        requestId,
        provider: "gemini",
        model,
        phase,
        attempt: 1,
        maxAttempts: 1,
        timeoutMs,
      };
      log("ai_goal_plan_provider_attempt_started", attemptFields);
      try {
        const response = await request(model, prompt, timeoutMs);
        log("ai_goal_plan_provider_attempt_succeeded", {
          ...attemptFields,
          elapsedMs: Date.now() - startedAt,
          responseCharacters: (response.text ?? "").length,
          finishReason: getFinishReason(response),
        });
        return response;
      } catch (error) {
        log("ai_goal_plan_provider_attempt_failed", {
          ...attemptFields,
          ...getGeminiErrorFields(error),
          elapsedMs: Date.now() - startedAt,
          retryable: isRetryableGeminiError(error) ? 1 : 0,
        });
        throw error;
      }
    };

    const parseResponse = (
      response: GeminiGoalPlanResponse,
      model: string,
      phase: GeminiGoalPlanPhase,
    ): Omit<GoalPlanDraft, "promptVersion"> => {
      const responseFields = {
        requestId,
        provider: "gemini",
        model,
        phase,
        finishReason: getFinishReason(response),
        responseCharacters: (response.text ?? "").length,
      };
      try {
        const draft = parseGeminiGoalPlanResponse(response);
        log("ai_goal_plan_provider_response_parsed", responseFields);
        return draft;
      } catch (error) {
        log("ai_goal_plan_provider_response_parse_failed", {
          ...responseFields,
          ...getGeminiErrorFields(error),
        });
        throw error;
      }
    };

    let primaryResponse: GeminiGoalPlanResponse;
    try {
      primaryResponse = await requestModel(GEMINI_GOAL_PLAN_MODEL, "primary");
      return parseResponse(primaryResponse, GEMINI_GOAL_PLAN_MODEL, "primary");
    } catch (error) {
      if (!isRetryableGeminiError(error)) throw error;

      log("ai_goal_plan_provider_primary_exhausted", {
        requestId,
        provider: "gemini",
        model: GEMINI_GOAL_PLAN_MODEL,
        ...getGeminiErrorFields(error),
      });
      log("ai_goal_plan_provider_fallback_started", {
        requestId,
        provider: "gemini",
        model: GEMINI_GOAL_PLAN_FALLBACK_MODEL,
        reason: "primary_transient_error",
        delayMs: GEMINI_MODEL_FALLBACK_DELAY_MS,
      });
      await delay(GEMINI_MODEL_FALLBACK_DELAY_MS);
      if (providerDeadline - Date.now() < GEMINI_REQUEST_TIMEOUT_MS) {
        log("ai_goal_plan_provider_budget_exhausted", {
          requestId,
          provider: "gemini",
          model: GEMINI_GOAL_PLAN_FALLBACK_MODEL,
          phase: "fallback",
          attempt: 1,
          maxAttempts: 1,
          budgetMs: GEMINI_PROVIDER_BUDGET_MS,
          ...getGeminiErrorFields(error),
        });
        throw error;
      }
      const fallbackResponse = await requestModel(
        GEMINI_GOAL_PLAN_FALLBACK_MODEL,
        "fallback",
      );
      return parseResponse(
        fallbackResponse,
        GEMINI_GOAL_PLAN_FALLBACK_MODEL,
        "fallback",
      );
    }
  };
}

export function createGeminiGoalPlanGenerator(
  apiKey: string,
): GoalPlanGenerator {
  return createGeminiGoalPlanGeneratorWithRequest(
    async (model, prompt, timeoutMs) => {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      return client.models.generateContent({
        model,
        contents: prompt.input,
        config: {
          systemInstruction: prompt.instructions,
          httpOptions: {
            timeout: timeoutMs,
            retryOptions: {
              // Retries are orchestrated above so every HTTP attempt is logged.
              attempts: 1,
              initialDelay: 0.25,
              maxDelay: 0.5,
              expBase: 2,
              jitter: 1,
              httpStatusCodes: GEMINI_RETRYABLE_STATUS_CODES,
            },
          },
          responseMimeType: "application/json",
          responseJsonSchema: GOAL_PLAN_DRAFT_SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 50_000,
        },
      });
    },
  );
}
