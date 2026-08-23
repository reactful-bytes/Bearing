import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  GoalPlanDraft,
  generateGoalPlanDraft,
  parseGoalPlanInput,
  validateGoalPlanDraft,
} from "./aiGoalPlan";

const request = {
  auth: { uid: "user-1" },
  data: {
    title: "Run a 10k",
    description: "Train consistently without overdoing it.",
    targetDate: "2027-06-01",
  },
};

const validDraft: Omit<GoalPlanDraft, "promptVersion"> = {
  smartMeta: {
    specific: "Finish a 10k race.",
    measurable: "Complete three runs each week.",
    achievable: "Increase distance gradually.",
    relevant: "Build sustainable fitness.",
    timeBound: "Race by June 1, 2027.",
  },
  milestones: [
    {
      title: "Build a running base",
      description: "Develop a consistent weekly routine.",
    },
  ],
  steps: [
    {
      title: "Choose three weekly run windows",
      description: "Reserve repeatable times that fit the week.",
      starter: "Open the calendar and choose the first run.",
      targetDate: "2027-01-15",
    },
  ],
  timelineSummary: "Build consistency first, then increase distance gradually.",
};

describe("AI goal plan", () => {
  it("normalizes valid input and rejects oversized input", () => {
    assert.deepEqual(parseGoalPlanInput(request.data), request.data);
    assert.throws(
      () => parseGoalPlanInput({ ...request.data, title: "x".repeat(121) }),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("validates and versions a structured draft", () => {
    assert.deepEqual(validateGoalPlanDraft(validDraft), {
      promptVersion: 1,
      ...validDraft,
    });
  });

  it("rejects malformed provider output", () => {
    assert.throws(() => validateGoalPlanDraft({ ...validDraft, steps: [] }));
    assert.throws(() =>
      validateGoalPlanDraft(
        {
          ...validDraft,
          steps: [{ ...validDraft.steps[0], targetDate: "2028-01-01" }],
        },
        "2027-06-01",
      ),
    );
  });

  it("returns a draft for a verified premium caller", async () => {
    const draft = await generateGoalPlanDraft(
      request,
      async () => validDraft,
      async () => "active",
    );

    assert.deepEqual(draft, { promptVersion: 1, ...validDraft });
  });

  it("authorizes the authenticated caller instead of a payload user ID", async () => {
    let lookedUpUserId = "";

    await generateGoalPlanDraft(
      {
        ...request,
        data: { ...request.data, userId: "other-user" },
      },
      async () => validDraft,
      async (userId) => {
        lookedUpUserId = userId;
        return "active";
      },
    );

    assert.equal(lookedUpUserId, "user-1");
  });

  it("does not invoke the provider for a free caller", async () => {
    let providerInvoked = false;

    await assert.rejects(
      generateGoalPlanDraft(
        request,
        async () => {
          providerInvoked = true;
          return validDraft;
        },
        async () => null,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "permission-denied",
    );
    assert.equal(providerInvoked, false);
  });

  it("returns a generic recoverable error for provider failures", async () => {
    await assert.rejects(
      generateGoalPlanDraft(
        request,
        async () => {
          throw new Error("provider detail");
        },
        async () => "in_grace_period",
      ),
      (error: unknown) =>
        error instanceof HttpsError &&
        error.code === "internal" &&
        !error.message.includes("provider detail"),
    );
  });
});
