import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_CREDIT_QUERY_COLLECTIONS,
  NOTIFICATION_QUERY_COLLECTIONS,
  redactPushDevice,
  createUserDataAdminReader,
  deleteUserDataWithProcessorCleanup,
} from "./privacyAdmin";

describe("admin privacy deletion", () => {
  it("redacts push tokens from exports without mutating stored device data", () => {
    const device = {
      id: "device-1",
      userId: "user-1",
      token: "private-token",
      timezone: "UTC",
    };
    assert.deepEqual(redactPushDevice(device), {
      id: "device-1",
      userId: "user-1",
      timezone: "UTC",
    });
    assert.equal(device.token, "private-token");
    assert.throws(() => redactPushDevice(null), /Invalid device export record/);
  });
  it("includes device registrations and delivery history in account lifecycle queries", () => {
    assert.deepEqual(NOTIFICATION_QUERY_COLLECTIONS, [
      "pushDevices",
      "notificationDeliveries",
    ]);
  });
  it("includes temporary credit operations in caller-scoped lifecycle queries", () => {
    assert.deepEqual(AI_CREDIT_QUERY_COLLECTIONS, ["aiCreditOperations"]);
  });

  it("adds the live RevenueCat balance to local lifecycle data", async () => {
    const requestedUserIds: string[] = [];
    const reader = createUserDataAdminReader(
      { apiKey: "v2-key", projectId: "project", currencyCode: "AIC" },
      async (userId) => {
        requestedUserIds.push(userId);
        return {
          userId,
          profile: null,
          subscription: null,
          aiCreditLock: null,
          aiCreditOperations: [],
          events: [],
          goals: [],
          milestones: [],
          notes: [],
          tasks: [],
          pushDevices: [],
          notificationDeliveries: [],
        };
      },
      async (userId) => {
        requestedUserIds.push(userId);
        return { code: "AIC", balance: 7 };
      },
    );

    assert.equal((await reader("user-1")).aiCreditBalance, 7);
    assert.deepEqual(requestedUserIds, ["user-1", "user-1"]);
  });

  it("deletes processor data before local account data", async () => {
    const operations: string[] = [];

    await deleteUserDataWithProcessorCleanup(
      "user-1",
      async () => {
        operations.push("processor");
      },
      async () => {
        operations.push("local");
      },
    );

    assert.deepEqual(operations, ["processor", "local"]);
  });

  it("preserves local account data when processor deletion fails", async () => {
    let localDeletionStarted = false;

    await assert.rejects(
      deleteUserDataWithProcessorCleanup(
        "user-1",
        async () => {
          throw new Error("processor unavailable");
        },
        async () => {
          localDeletionStarted = true;
        },
      ),
      /processor unavailable/,
    );

    assert.equal(localDeletionStarted, false);
  });
});
