import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deleteUserDataWithProcessorCleanup } from "./privacyAdmin";

describe("admin privacy deletion", () => {
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
