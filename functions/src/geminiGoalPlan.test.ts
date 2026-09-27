import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GeminiGoalPlanOutputError,
  parseGeminiGoalPlanResponse,
} from "./geminiGoalPlan";

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
});
