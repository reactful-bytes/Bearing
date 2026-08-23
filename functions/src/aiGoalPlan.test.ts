import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  GoalPlanMeter,
  GoalPlanDraft,
  generateGoalPlanDraft,
  parseGoalPlanInput,
  validateGoalPlanDraft,
} from "./aiGoalPlan";

function meter(overrides: Partial<GoalPlanMeter> = {}): GoalPlanMeter {
  return {
    prepare: async () => undefined,
    reserve: async () => ({ kind: "reserved", availableCredits: 9 }),
    finalize: async () => 9,
    refund: async () => undefined,
    ...overrides,
  };
}

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

  it("returns request and remaining-credit metadata after a metered success", async () => {
    const requestId = "123e4567-e89b-42d3-a456-426614174000";
    let finalized = false;
    const result = await generateGoalPlanDraft(
      { ...request, data: { ...request.data, requestId } },
      async () => validDraft,
      async () => "active",
      meter({
        finalize: async () => {
          finalized = true;
          return 9;
        },
      }),
    );

    assert.equal(finalized, true);
    assert.deepEqual(result, {
      promptVersion: 1,
      ...validDraft,
      requestId,
      availableCredits: 9,
    });
  });

  it("refunds a reservation when provider output fails validation", async () => {
    let refunded = false;
    await assert.rejects(
      generateGoalPlanDraft(
        {
          ...request,
          data: {
            ...request.data,
            requestId: "123e4567-e89b-42d3-a456-426614174000",
          },
        },
        async () => ({ ...validDraft, steps: [] }),
        async () => "active",
        meter({
          refund: async () => {
            refunded = true;
          },
        }),
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "internal",
    );
    assert.equal(refunded, true);
  });

  it("generates a compatible request ID for old clients", async () => {
    let generatedRequestId = "";
    const result = await generateGoalPlanDraft(
      request,
      async () => validDraft,
      async () => "active",
      meter({
        reserve: async (_userId, requestId) => {
          generatedRequestId = requestId;
          return { kind: "reserved", availableCredits: 9 };
        },
      }),
    );

    assert.match(
      generatedRequestId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.equal(
      "requestId" in result ? result.requestId : "",
      generatedRequestId,
    );
  });

  it("returns a matching cached replay without invoking the provider", async () => {
    let providerInvoked = false;
    const result = await generateGoalPlanDraft(
      {
        ...request,
        data: {
          ...request.data,
          requestId: "123e4567-e89b-42d3-a456-426614174000",
        },
      },
      async () => {
        providerInvoked = true;
        return validDraft;
      },
      async () => "active",
      meter({
        reserve: async () => ({
          kind: "replay",
          availableCredits: 8,
          draft: validDraft,
        }),
      }),
    );

    assert.equal(providerInvoked, false);
    assert.equal(
      "availableCredits" in result ? result.availableCredits : -1,
      8,
    );
  });
});
