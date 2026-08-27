import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { deleteUserAccount, exportUserData } from "./privacy";

const now = new Date("2026-07-31T12:00:00.000Z");
const verifiedRequest = {
  auth: {
    uid: "user-1",
    token: { auth_time: Math.floor(now.getTime() / 1_000) - 60 },
  },
};

describe("privacy handlers", () => {
  it("exports only the verified caller data", async () => {
    let requestedUserId = "";
    const requestWithForgedTarget = {
      ...verifiedRequest,
      data: { userId: "other-user" },
    };
    const result = await exportUserData(
      requestWithForgedTarget,
      async (userId) => {
        requestedUserId = userId;
        return {
          userId,
          profile: { displayName: "Owner" },
          subscription: null,
          aiCreditBalance: 7,
          aiCreditLock: null,
          aiCreditOperations: [],
          events: [],
          goals: [],
          goalSteps: [],
          notes: [],
          tasks: [],
        };
      },
      now,
    );

    assert.equal(requestedUserId, "user-1");
    assert.equal(result.userId, "user-1");
    assert.equal(result.exportedAt, now.toISOString());
  });

  it("deletes only after recent authentication", async () => {
    let deletedUserId = "";
    assert.deepEqual(
      await deleteUserAccount(
        verifiedRequest,
        async (userId) => {
          deletedUserId = userId;
        },
        now,
      ),
      { deleted: true },
    );
    assert.equal(deletedUserId, "user-1");
  });

  it("rejects stale authentication before deletion", async () => {
    let deletionStarted = false;
    const staleRequest = {
      ...verifiedRequest,
      auth: {
        uid: "user-1",
        token: { auth_time: Math.floor(now.getTime() / 1_000) - 301 },
      },
    };

    await assert.rejects(
      deleteUserAccount(
        staleRequest,
        async () => {
          deletionStarted = true;
        },
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "failed-precondition",
    );
    assert.equal(deletionStarted, false);
  });
});
