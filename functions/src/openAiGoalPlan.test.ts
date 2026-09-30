import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createOpenAiGoalPlanGeneratorWithRequest,
  OpenAiGoalPlanOutputError,
  OPENAI_GOAL_PLAN_MODEL,
  parseOpenAiGoalPlanResponse,
} from "./openAiGoalPlan";
import { createGoalPlanPrompt } from "./aiGoalPlan";

const validDraft = {
  smartMeta: {
    specific: "Complete a 10k.",
    measurable: "Run three times a week.",
    achievable: "Build distance gradually.",
    relevant: "Improve fitness.",
    timeBound: "By June 2027.",
  },
  milestones: [
    {
      title: "Build a running base",
      description: "Develop a consistent weekly routine.",
      targetDate: "2027-04-15",
      tasks: [
        {
          title: "Choose weekly run windows",
          description: "Reserve repeatable times that fit the week.",
          starter: "Open the calendar and choose the first run.",
          targetDate: "2027-01-15",
        },
      ],
    },
  ],
  timelineSummary: "Build a consistent routine.",
};

describe("OpenAI goal-plan response parsing", () => {
  it("parses complete structured JSON", () => {
    assert.deepEqual(
      parseOpenAiGoalPlanResponse({
        output_text: JSON.stringify(validDraft),
        status: "completed",
      }),
      validDraft,
    );
  });

  it("rejects incomplete and empty responses", () => {
    assert.throws(
      () =>
        parseOpenAiGoalPlanResponse({
          output_text: '{"milestones":[',
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }),
      (error: unknown) =>
        error instanceof OpenAiGoalPlanOutputError &&
        error.code === "openai_output_invalid" &&
        error.responseCharacters === 15,
    );
    assert.throws(
      () =>
        parseOpenAiGoalPlanResponse({ output_text: "", status: "completed" }),
      (error: unknown) =>
        error instanceof OpenAiGoalPlanOutputError &&
        error.message === "OpenAI returned no goal-plan text.",
    );
  });

  it("reports malformed JSON without exposing response content", () => {
    assert.throws(
      () =>
        parseOpenAiGoalPlanResponse({
          output_text: "private response {not-json}",
          status: "completed",
        }),
      (error: unknown) =>
        error instanceof OpenAiGoalPlanOutputError &&
        error.message.includes("not valid JSON") &&
        !error.message.includes("private response"),
    );
  });

  it("uses its fixed model and sends the shared goal prompt", async () => {
    let requestedModel = "";
    let instructions = "";
    let input = "";
    const generator = createOpenAiGoalPlanGeneratorWithRequest(
      async (model, prompt) => {
        requestedModel = model;
        instructions = prompt.instructions;
        input = prompt.input;
        return { output_text: JSON.stringify(validDraft), status: "completed" };
      },
    );

    await generator(
      createGoalPlanPrompt({
        title: "Run a 10k",
        description: "Train consistently.",
        targetDate: "2027-06-01",
        planningStartDate: "2026-12-01",
      }),
    );

    assert.equal(requestedModel, OPENAI_GOAL_PLAN_MODEL);
    assert.deepEqual(JSON.parse(input), {
      title: "Run a 10k",
      description: "Train consistently.",
      targetDate: "2027-06-01",
      planningStartDate: "2026-12-01",
    });
    assert.match(instructions, /Return only the goal-plan JSON/);
  });
});
