import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  parsePushTicket,
  PushTransportError,
  readExpoReceipt,
  sendExpoPush,
} from "./expoPush";

afterEach(() => mock.restoreAll());
describe("Expo push transport", () => {
  it("sends authorization and accepts only a valid ticket", async () => {
    const spy = mock.method(
      globalThis,
      "fetch",
      async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        assert.equal(
          (init?.headers as Record<string, string>).Authorization,
          "Bearer test-secret",
        );
        assert.deepEqual(JSON.parse(String(init?.body)), [
          { to: "ExpoPushToken[test]" },
        ]);
        return new Response(
          JSON.stringify({ data: [{ status: "ok", id: "ticket-1" }] }),
        );
      },
    );
    assert.deepEqual(
      await sendExpoPush({ to: "ExpoPushToken[test]" }, "test-secret"),
      { status: "ok", id: "ticket-1" },
    );
    assert.equal(spy.mock.callCount(), 1);
  });
  it("distinguishes rate limits from ambiguous network/provider failures", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () => new Response("", { status: 429 }),
    );
    await assert.rejects(
      sendExpoPush({}, "secret"),
      (error: unknown) =>
        error instanceof PushTransportError &&
        error.retryable &&
        !error.ambiguous,
    );
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      throw new Error("network failed");
    });
    await assert.rejects(
      sendExpoPush({}, "secret"),
      (error: unknown) =>
        error instanceof PushTransportError &&
        !error.retryable &&
        error.ambiguous &&
        error.cause instanceof Error,
    );
  });
  it("does not turn malformed success responses into successful delivery", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () => new Response(JSON.stringify({ data: [] })),
    );
    await assert.rejects(sendExpoPush({}, "secret"), PushTransportError);
    assert.throws(() => parsePushTicket({ status: "ok" }), PushTransportError);
  });
  it("reads pending/success/error receipts without guessing", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () => new Response(JSON.stringify({ data: {} })),
    );
    assert.equal(await readExpoReceipt("ticket", "secret"), null);
    mock.restoreAll();
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response(JSON.stringify({ data: { ticket: { status: "ok" } } })),
    );
    assert.deepEqual(await readExpoReceipt("ticket", "secret"), {
      status: "ok",
      id: "ticket",
    });
    assert.deepEqual(
      parsePushTicket({
        status: "error",
        details: { error: "DeviceNotRegistered" },
      }),
      { status: "error", code: "DeviceNotRegistered" },
    );
  });
});
