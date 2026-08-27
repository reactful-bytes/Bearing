import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RevenueCatV2RetryableError,
  RevenueCatVirtualCurrencyExhaustedError,
  createRevenueCatVirtualCurrencyTransaction,
  getRevenueCatVirtualCurrencyBalance,
} from "./revenueCatV2";

const config = {
  apiKey: "v2-secret",
  projectId: "project-id",
  currencyCode: "aic",
};

describe("RevenueCat V2 virtual currency", () => {
  it("returns zero when the customer does not exist", async () => {
    const result = await getRevenueCatVirtualCurrencyBalance(
      "new-user",
      config,
      async () => new Response(null, { status: 404 }),
    );

    assert.deepEqual(result, { code: "AIC", balance: 0 });
  });

  it("reads an uncached non-negative integer balance", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (input, init) => {
      calls += 1;
      assert.match(
        String(input),
        /\/v2\/projects\/project-id\/customers\/user-1\/virtual_currencies$/,
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer v2-secret",
      );
      return Response.json({ items: [{ currency_code: "AIC", balance: 7 }] });
    };

    assert.deepEqual(
      await getRevenueCatVirtualCurrencyBalance("user-1", config, fetcher),
      {
        code: "AIC",
        balance: 7,
      },
    );
    await getRevenueCatVirtualCurrencyBalance("user-1", config, fetcher);
    assert.equal(calls, 2);
  });

  it("rejects malformed, fractional, negative, missing, and duplicate balances", async () => {
    for (const payload of [
      null,
      {},
      { items: [{ currency_code: "AIC", balance: 1.5 }] },
      { items: [{ currency_code: "AIC", balance: -1 }] },
      { items: [{ currency_code: "OTHER", balance: 1 }] },
      {
        items: [
          { currency_code: "AIC", balance: 1 },
          { currency_code: "AIC", balance: 1 },
        ],
      },
    ]) {
      await assert.rejects(
        getRevenueCatVirtualCurrencyBalance("user-1", config, async () =>
          Response.json(payload),
        ),
        /response is invalid/,
      );
    }
  });

  it("posts exactly one unit with a caller-supplied idempotency key", async () => {
    for (const [transaction, amount] of [
      ["debit", -1],
      ["refund", 1],
    ] as const) {
      await createRevenueCatVirtualCurrencyTransaction(
        "user-1",
        transaction,
        `operation:${transaction}`,
        config,
        async (input, init) => {
          assert.match(String(input), /\/virtual_currencies\/transactions$/);
          assert.equal(init?.method, "POST");
          const headers = new Headers(init?.headers);
          assert.equal(
            headers.get("Idempotency-Key"),
            `operation:${transaction}`,
          );
          assert.deepEqual(JSON.parse(String(init?.body)), {
            adjustments: { AIC: amount },
          });
          return new Response(null, { status: 201 });
        },
      );
    }
  });

  it("types exhaustion without exposing response content", async () => {
    await assert.rejects(
      createRevenueCatVirtualCurrencyTransaction(
        "user-1",
        "debit",
        "operation:debit",
        config,
        async () => new Response("customer and token details", { status: 422 }),
      ),
      RevenueCatVirtualCurrencyExhaustedError,
    );
  });

  it("types lock, rate-limit, server, and network failures as retryable", async () => {
    for (const status of [423, 429, 500, 503]) {
      await assert.rejects(
        getRevenueCatVirtualCurrencyBalance(
          "user-1",
          config,
          async () => new Response("sensitive", { status }),
        ),
        (error: unknown) =>
          error instanceof RevenueCatV2RetryableError &&
          error.status === status,
      );
    }
    await assert.rejects(
      getRevenueCatVirtualCurrencyBalance("user-1", config, async () => {
        throw new Error("token=v2-secret");
      }),
      (error: unknown) =>
        error instanceof RevenueCatV2RetryableError &&
        error.status === null &&
        !error.message.includes("v2-secret"),
    );
  });
});
