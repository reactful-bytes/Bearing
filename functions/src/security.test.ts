import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { requireAuthenticatedCaller } from "./security";

describe("requireAuthenticatedCaller", () => {
  it("returns only the authenticated user identity", () => {
    assert.deepEqual(
      requireAuthenticatedCaller({
        auth: { uid: "user-1" },
      }),
      { uid: "user-1" },
    );
  });

  it("rejects unauthenticated requests", () => {
    assert.throws(
      () => requireAuthenticatedCaller({}),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
  });
});
