import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import {
  disablePushDeviceHandler,
  parsePushDeviceInput,
  registerPushDeviceHandler,
} from "./pushDevices";

const input = {
  token: "ExpoPushToken[test-device]",
  installationId: "installation-12345678",
  timezone: "America/Chicago",
};
describe("push device authorization and validation", () => {
  it("requires authentication before registration or disabling", async () => {
    for (const handler of [
      registerPushDeviceHandler,
      disablePushDeviceHandler,
    ]) {
      await assert.rejects(
        handler({ data: input }),
        (error: unknown) =>
          error instanceof HttpsError && error.code === "unauthenticated",
      );
    }
  });
  it("validates tokens, installation identity and IANA timezone", () => {
    assert.deepEqual(parsePushDeviceInput(input), input);
    for (const value of [
      { ...input, token: "invalid" },
      { ...input, installationId: "../device" },
      { ...input, timezone: "invalid" },
      null,
    ]) {
      assert.throws(() => parsePushDeviceInput(value), HttpsError);
    }
  });
});
