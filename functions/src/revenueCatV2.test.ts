import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ensureRevenueCatCustomer,
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
        /\/v2\/projects\/project-id\/customers\/user-1\/virtual_currencies\?include_empty_balances=true$/,
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

  it("returns zero for valid empty or unrelated balances", async () => {
    for (const items of [
      [],
      [{ currency_code: "OTHER", balance: 1 }],
      [{ currency_code: "AIC", balance: 0 }],
    ]) {
      assert.deepEqual(
        await getRevenueCatVirtualCurrencyBalance("user-1", config, async () =>
          Response.json({ items }),
        ),
        { code: "AIC", balance: 0 },
      );
    }
  });

  it("follows customer-scoped pages and rejects unsafe or repeated pagination", async () => {
    let calls = 0;
    const result = await getRevenueCatVirtualCurrencyBalance(
      "user-1",
      config,
      async (input) => {
        calls += 1;
        assert.equal(
          new URL(String(input)).searchParams.get("include_empty_balances"),
          "true",
        );
        return calls === 1
          ? Response.json({
              items: [],
              next_page:
                "/v2/projects/project-id/customers/user-1/virtual_currencies?starting_after=OTHER",
            })
          : Response.json({ items: [{ currency_code: "AIC", balance: 3 }] });
      },
    );
    assert.equal(result.balance, 3);
    assert.equal(calls, 2);
    for (const next_page of [
      "https://attacker.example/secret",
      "/v2/projects/project-id/customers/other-user/virtual_currencies",
      "/v2/projects/project-id/customers/user-1/virtual_currencies",
      12,
    ]) {
      await assert.rejects(
        getRevenueCatVirtualCurrencyBalance("user-1", config, async () =>
          Response.json({ items: [], next_page }),
        ),
        /pagination is invalid/,
      );
    }
  });

  it("rejects malformed, fractional, negative, and duplicate balances", async () => {
    for (const payload of [
      null,
      {},
      { items: [{ currency_code: "AIC", balance: 1.5 }] },
      { items: [{ currency_code: "AIC", balance: -1 }] },
      { items: [null] },
      { items: [{}] },
      { items: [{ currency_code: "", balance: 1 }] },
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

  it("rejects duplicate balances across pages and missing continuation pages", async () => {
    for (const duplicate of [true, false]) {
      let calls = 0;
      await assert.rejects(
        getRevenueCatVirtualCurrencyBalance("user-1", config, async () => {
          calls += 1;
          if (calls === 1)
            return Response.json({
              items: [{ currency_code: "AIC", balance: 1 }],
              next_page:
                "/v2/projects/project-id/customers/user-1/virtual_currencies?starting_after=AIC",
            });
          return duplicate
            ? Response.json({ items: [{ currency_code: "AIC", balance: 2 }] })
            : new Response(null, { status: 404 });
        }),
        duplicate ? /response is invalid/ : /balance failed: 404/,
      );
      assert.equal(calls, 2);
    }
  });

  it("caps endless pagination", async () => {
    let calls = 0;
    await assert.rejects(
      getRevenueCatVirtualCurrencyBalance("user-1", config, async () => {
        calls += 1;
        return Response.json({
          items: [],
          next_page: `/v2/projects/project-id/customers/user-1/virtual_currencies?starting_after=${calls}`,
        });
      }),
      /pagination is invalid/,
    );
    assert.equal(calls, 100);
  });

  it("posts the requested units with a caller-supplied idempotency key", async () => {
    for (const [transaction, units, adjustment] of [
      ["debit", undefined, -1],
      ["refund", undefined, 1],
      ["grant", undefined, 1],
      ["grant", 2, 2],
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
            adjustments: { AIC: adjustment },
          });
          return new Response(null, { status: 201 });
        },
        units,
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

  it("bootstraps customers and accepts an existing customer without hiding failures", async () => {
    for (const status of [201, 409]) {
      await ensureRevenueCatCustomer("user-1", config, async (url, init) => {
        assert.equal(
          String(url),
          "https://api.revenuecat.com/v2/projects/project-id/customers",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), { id: "user-1" });
        return new Response(null, { status });
      });
    }
    await assert.rejects(
      ensureRevenueCatCustomer(
        "user-1",
        config,
        async () => new Response(null, { status: 403 }),
      ),
      /customer creation failed: 403/,
    );
    await assert.rejects(
      ensureRevenueCatCustomer(
        "user-1",
        config,
        async () => new Response(null, { status: 503 }),
      ),
      RevenueCatV2RetryableError,
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
