import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { requireVerifiedCaller } from "./security";

describe("requireVerifiedCaller", () => {
  it("returns the authenticated user and verified app identities", () => {
    assert.deepEqual(
      requireVerifiedCaller({
        app: { appId: "bearing-app" },
        auth: { uid: "user-1" },
      }),
      { appId: "bearing-app", uid: "user-1" },
    );
  });

  it("rejects unauthenticated requests", () => {
    assert.throws(
      () => requireVerifiedCaller({ app: { appId: "bearing-app" } }),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
  });

  it("rejects requests without App Check", () => {
    assert.throws(
      () => requireVerifiedCaller({ auth: { uid: "user-1" } }),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "failed-precondition",
    );
  });
});
