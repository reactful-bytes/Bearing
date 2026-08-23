import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBackendStatus } from "./status";

describe("getBackendStatus", () => {
  it("returns only non-sensitive service state to verified callers", () => {
    assert.deepEqual(
      getBackendStatus({
        auth: { uid: "user-1" },
      }),
      { authenticated: true, status: "ok" },
    );
  });
});
