import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import { GoalPlanDraft } from "./aiGoalPlan";
import { createGoalPlanDraftAdminPersister } from "./goalDraftAdmin";

type FakeReference = {
  collectionName: string;
  id: string;
};

type FakeQuery = {
  collectionName: string;
  field: string;
  value: unknown;
};

function createFakeFirestore(
  seed: Record<string, Record<string, unknown>> = {},
) {
  const documents = new Map(Object.entries(seed));
  const reference = (collectionName: string, id: string): FakeReference => ({
    collectionName,
    id,
  });
  const keyOf = (target: FakeReference) =>
    `${target.collectionName}/${target.id}`;
  const snapshotFor = (target: FakeReference) => {
    const data = documents.get(keyOf(target));
    return {
      id: target.id,
      ref: target,
      exists: data !== undefined,
      data: () => data,
    };
  };
  const firestore = {
    collection(collectionName: string) {
      return {
        doc(id: string) {
          return reference(collectionName, id);
        },
        where(field: string, _operator: string, value: unknown): FakeQuery {
          return { collectionName, field, value };
        },
      };
    },
    async runTransaction<T>(
      operation: (transaction: unknown) => Promise<T>,
    ): Promise<T> {
      const transaction = {
        async get(target: FakeReference | FakeQuery) {
          if ("field" in target) {
            const docs = [...documents.entries()]
              .filter(
                ([key, data]) =>
                  key.startsWith(`${target.collectionName}/`) &&
                  data[target.field] === target.value,
              )
              .map(([key]) =>
                snapshotFor(
                  reference(target.collectionName, key.split("/")[1]),
                ),
              );
            return { docs, size: docs.length };
          }
          return snapshotFor(target);
        },
        set(target: FakeReference, data: Record<string, unknown>) {
          documents.set(keyOf(target), data);
        },
        delete(target: FakeReference) {
          documents.delete(keyOf(target));
        },
      };
      return operation(transaction);
    },
  };
  return { firestore, documents };
}

const draft: GoalPlanDraft = {
  promptVersion: 1,
  smartMeta: {
    specific: "Complete a 10k race.",
    measurable: "Finish the race.",
    achievable: "Train three times a week.",
    relevant: "Build sustainable fitness.",
    timeBound: "By June 2027.",
  },
  milestones: [
    {
      title: "Build a running base",
      description: "Complete a consistent weekly routine.",
      targetDate: "2027-04-15",
      tasks: [
        {
          title: "Choose run days",
          description: "Reserve three weekly run windows.",
          starter: "Open the calendar.",
          targetDate: "2027-01-15",
        },
      ],
    },
  ],
  timelineSummary: "Build consistency, then increase distance.",
};

describe("goal draft Admin persistence", () => {
  it("persists the goal tree before returning stable Firestore IDs", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const { firestore, documents } = createFakeFirestore({
      "goals/goal-1": {
        userId: "user-1",
        status: "draft",
        createdAt,
      },
    });
    const persistDraft = createGoalPlanDraftAdminPersister(
      firestore as unknown as Firestore,
    );

    const result = await persistDraft(
      "user-1",
      {
        goalId: "goal-1",
        title: "Run a 10k",
        description: "Train consistently.",
        targetDate: "2027-06-01",
        timezone: "America/New_York",
      },
      draft,
      "request-1",
    );

    assert.equal(result.goalId, "goal-1");
    assert.ok(result.milestones[0].id);
    assert.ok(result.milestones[0].tasks[0].id);
    assert.equal(documents.get("goals/goal-1")?.status, "draft");
    assert.equal(documents.get("goals/goal-1")?.createdAt, createdAt);
    assert.equal(
      documents.get(`milestones/${result.milestones[0].id}`)?.goalId,
      "goal-1",
    );
    assert.equal(
      documents.get(`tasks/${result.milestones[0].tasks[0].id}`)?.milestoneId,
      result.milestones[0].id,
    );

    const targetDate = documents.get("goals/goal-1")
      ?.estimatedCompletionDate as {
      toDate: () => Date;
    };
    const localParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(targetDate.toDate());
    assert.deepEqual(
      Object.fromEntries(
        localParts
          .filter(({ type }) => ["year", "month", "day", "hour"].includes(type))
          .map(({ type, value }) => [type, value]),
      ),
      expectDateParts,
    );

    const regeneratedDraft = {
      ...draft,
      milestones: [
        { ...draft.milestones[0], title: "Increase weekly distance" },
      ],
    };
    const regenerated = await persistDraft(
      "user-1",
      {
        goalId: "goal-1",
        title: "Run a 10k",
        description: "Train consistently.",
        targetDate: "2027-06-01",
        timezone: "America/New_York",
      },
      regeneratedDraft,
      "request-2",
    );

    assert.equal(regenerated.goalId, result.goalId);
    assert.equal(documents.has(`milestones/${result.milestones[0].id}`), false);
    assert.equal(
      documents.has(`tasks/${result.milestones[0].tasks[0].id}`),
      false,
    );
    assert.equal(documents.get("goals/goal-1")?.createdAt, createdAt);
    assert.equal(
      documents.get(`milestones/${regenerated.milestones[0].id}`)?.title,
      "Increase weekly distance",
    );
  });

  it("rejects an existing goal that is not an owned draft", async () => {
    const { firestore } = createFakeFirestore({
      "goals/goal-1": { userId: "another-user", status: "draft" },
    });
    const persistDraft = createGoalPlanDraftAdminPersister(
      firestore as unknown as Firestore,
    );

    await assert.rejects(
      persistDraft(
        "user-1",
        {
          goalId: "goal-1",
          title: "Run a 10k",
          description: "Train consistently.",
          targetDate: "2027-06-01",
          timezone: "UTC",
        },
        draft,
        "request-1",
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "failed-precondition",
    );
  });
});

const expectDateParts = {
  year: "2027",
  month: "06",
  day: "01",
  hour: "12",
};
