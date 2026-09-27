import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createGeminiGoalPlanGeneratorWithRequest,
  GeminiGoalPlanOutputError,
  GEMINI_GOAL_PLAN_FALLBACK_MODEL,
  GEMINI_GOAL_PLAN_MODEL,
  parseGeminiGoalPlanResponse,
} from "./geminiGoalPlan";
import { GOAL_PLAN_MAX_TASKS } from "./aiGoalPlan";

describe("Gemini goal-plan response parsing", () => {
  it("parses complete structured JSON", () => {
    const draft = {
      smartMeta: {
        specific: "Complete a 10k.",
        measurable: "Run three times a week.",
        achievable: "Build distance gradually.",
        relevant: "Improve fitness.",
        timeBound: "By June 2027.",
      },
      milestones: [],
      timelineSummary: "Build a consistent routine.",
    };

    assert.deepEqual(
      parseGeminiGoalPlanResponse({
        text: JSON.stringify(draft),
        candidates: [{ finishReason: "STOP" }],
      }),
      draft,
    );
  });

  it("identifies a response truncated by the output token limit", () => {
    assert.throws(
      () =>
        parseGeminiGoalPlanResponse({
          text: '{"milestones":[',
          candidates: [{ finishReason: "MAX_TOKENS" }],
        }),
      (error: unknown) =>
        error instanceof GeminiGoalPlanOutputError &&
        error.code === "gemini_output_invalid" &&
        error.finishReason === "MAX_TOKENS" &&
        error.responseCharacters === 15,
    );
  });

  it("accepts complete JSON even when Gemini reports the token limit", () => {
    const draft = {
      smartMeta: {
        specific: "Complete a 10k.",
        measurable: "Run three times a week.",
        achievable: "Build distance gradually.",
        relevant: "Improve fitness.",
        timeBound: "By June 2027.",
      },
      milestones: [],
      timelineSummary: "Build a consistent routine.",
    };

    assert.deepEqual(
      parseGeminiGoalPlanResponse({
        text: JSON.stringify(draft),
        candidates: [{ finishReason: "MAX_TOKENS" }],
      }),
      draft,
    );
  });

  it("reports malformed JSON without exposing the response text", () => {
    assert.throws(
      () =>
        parseGeminiGoalPlanResponse({
          text: "private response content {not-json}",
          candidates: [{ finishReason: "STOP" }],
        }),
      (error: unknown) =>
        error instanceof GeminiGoalPlanOutputError &&
        error.message.includes("not complete valid JSON") &&
        !error.message.includes("private response content"),
    );
  });

  it("reports an empty response with its finish reason", () => {
    assert.throws(
      () =>
        parseGeminiGoalPlanResponse({
          text: "",
          candidates: [{ finishReason: "SAFETY" }],
        }),
      (error: unknown) =>
        error instanceof GeminiGoalPlanOutputError &&
        error.finishReason === "SAFETY" &&
        error.responseCharacters === 0,
    );
  });

  it("asks for granular, scope-scaled tasks and meaningful dated repeats", async () => {
    let prompt = "";
    const generator = createGeminiGoalPlanGeneratorWithRequest(
      async (_model, contents) => {
        prompt = contents;
        return {
          text: JSON.stringify({
            smartMeta: {},
            milestones: [],
            timelineSummary: "",
          }),
        };
      },
      () => {},
    );

    await generator({
      title: "Test goal",
      description: "",
      targetDate: "2027-01-01",
      planningStartDate: "2026-09-27",
    });

    assert.match(
      prompt,
      new RegExp(`up to ${GOAL_PLAN_MAX_TASKS} tasks total`),
    );
    assert.match(prompt, /one focused work block/);
    assert.match(prompt, /separate dated tasks/);
    assert.match(
      prompt,
      /scale the number of tasks to the goal's scope and duration/,
    );
  });

  it("retries transient primary failures before using the fallback model", async () => {
    const models: string[] = [];
    const events: Array<{
      event: string;
      fields: Record<string, string | number>;
    }> = [];
    const generator = createGeminiGoalPlanGeneratorWithRequest(
      async (model) => {
        models.push(model);
        if (model === GEMINI_GOAL_PLAN_MODEL) {
          const error = new Error("temporary overload") as Error & {
            status: number;
          };
          error.status = 503;
          throw error;
        }
        return {
          text: JSON.stringify({
            smartMeta: {},
            milestones: [],
            timelineSummary: "",
          }),
        };
      },
      (event, fields) => events.push({ event, fields }),
      async () => {},
    );

    const result = await generator(
      {
        title: "Test goal",
        description: "",
        targetDate: "2027-01-01",
        planningStartDate: "2026-09-27",
      },
      { requestId: "123e4567-e89b-42d3-a456-426614174000" },
    );

    assert.deepEqual(models, [
      GEMINI_GOAL_PLAN_MODEL,
      GEMINI_GOAL_PLAN_MODEL,
      GEMINI_GOAL_PLAN_FALLBACK_MODEL,
    ]);
    assert.deepEqual(
      events
        .filter(
          ({ event }) => event === "ai_goal_plan_provider_attempt_started",
        )
        .map(({ fields }) => [
          fields.model,
          fields.attempt,
          fields.maxAttempts,
        ]),
      [
        [GEMINI_GOAL_PLAN_MODEL, 1, 2],
        [GEMINI_GOAL_PLAN_MODEL, 2, 2],
        [GEMINI_GOAL_PLAN_FALLBACK_MODEL, 1, 2],
      ],
    );
    assert.ok(
      events.some(
        ({ event, fields }) =>
          event === "ai_goal_plan_provider_primary_exhausted" &&
          fields.httpStatus === 503,
      ),
    );
    assert.ok(
      events.some(
        ({ event, fields }) =>
          event === "ai_goal_plan_provider_response_parsed" &&
          fields.model === GEMINI_GOAL_PLAN_FALLBACK_MODEL,
      ),
    );
    assert.equal(
      events.some(({ fields }) => "contents" in fields || "goal" in fields),
      false,
    );
    assert.deepEqual(result, {
      smartMeta: {},
      milestones: [],
      timelineSummary: "",
    });
  });

  it("does not switch models for non-transient provider errors", async () => {
    const models: string[] = [];
    const events: string[] = [];
    const generator = createGeminiGoalPlanGeneratorWithRequest(
      async (model) => {
        models.push(model);
        const error = new Error("invalid request") as Error & {
          status: number;
        };
        error.status = 400;
        throw error;
      },
      (event) => events.push(event),
      async () => {},
    );

    await assert.rejects(
      generator({
        title: "Test goal",
        description: "",
        targetDate: "2027-01-01",
        planningStartDate: "2026-09-27",
      }),
      /invalid request/,
    );
    assert.deepEqual(models, [GEMINI_GOAL_PLAN_MODEL]);
    assert.equal(
      events.includes("ai_goal_plan_provider_fallback_started"),
      false,
    );
  });

  it("retries a transient fallback failure within the shared provider budget", async () => {
    const models: string[] = [];
    const timeouts: number[] = [];
    const events: string[] = [];
    let fallbackCalls = 0;
    const generator = createGeminiGoalPlanGeneratorWithRequest(
      async (model, _contents, timeoutMs) => {
        models.push(model);
        timeouts.push(timeoutMs);
        if (model === GEMINI_GOAL_PLAN_MODEL) {
          const error = new Error("temporary overload") as Error & {
            status: number;
          };
          error.status = 503;
          throw error;
        }
        fallbackCalls += 1;
        if (fallbackCalls === 1) {
          const error = new Error("fallback still overloaded") as Error & {
            status: number;
          };
          error.status = 503;
          throw error;
        }
        return {
          text: JSON.stringify({
            smartMeta: {},
            milestones: [],
            timelineSummary: "",
          }),
        };
      },
      (event) => events.push(event),
      async () => {},
    );

    await generator({
      title: "Test goal",
      description: "",
      targetDate: "2027-01-01",
      planningStartDate: "2026-09-27",
    });

    assert.deepEqual(models, [
      GEMINI_GOAL_PLAN_MODEL,
      GEMINI_GOAL_PLAN_MODEL,
      GEMINI_GOAL_PLAN_FALLBACK_MODEL,
      GEMINI_GOAL_PLAN_FALLBACK_MODEL,
    ]);
    assert.ok(
      timeouts.every((timeoutMs) => timeoutMs > 0 && timeoutMs <= 10_000),
    );
    assert.equal(
      events.filter(
        (event) => event === "ai_goal_plan_provider_retry_scheduled",
      ).length,
      2,
    );
    assert.ok(events.includes("ai_goal_plan_provider_response_parsed"));
  });
});
