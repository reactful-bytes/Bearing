import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  createRevenueCatProductGrantCatalog,
  getRevenueCatProductGrantCatalog,
} from "./revenueCatCatalog";
import { RevenueCatV2RetryableError } from "./revenueCatV2";

const config = {
  apiKey: "v2-secret",
  projectId: "project-id",
  currencyCode: "AIC",
};

describe("RevenueCat product-grant catalog", () => {
  it("joins grants to store identifiers across paginated products", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("products?limit=100")) {
        return Response.json({
          items: [
            {
              id: "product-1",
              store_identifier: "bearing_monthly",
              type: "subscription",
            },
          ],
          next_page: "/v2/projects/project-id/products?starting_after=one",
        });
      }
      if (url.includes("starting_after=one")) {
        return Response.json({
          items: [
            {
              id: "product-2",
              store_identifier: "bearing_annual",
              type: "subscription",
            },
          ],
          next_page: null,
        });
      }
      return Response.json({
        code: "AIC",
        product_grants: [
          {
            product_ids: ["product-1", "product-2"],
            amount: Number("8"),
            trial_amount: Number("1"),
            expire_at_cycle_end: false,
          },
        ],
      });
    };
    assert.deepEqual(
      await createRevenueCatProductGrantCatalog(config, fetcher)(),
      [
        {
          storeProductId: "bearing_annual",
          productType: "subscription",
          currencyCode: "AIC",
          amount: 8,
          trialAmount: 1,
          expiresAtCycleEnd: false,
        },
        {
          storeProductId: "bearing_monthly",
          productType: "subscription",
          currencyCode: "AIC",
          amount: 8,
          trialAmount: 1,
          expiresAtCycleEnd: false,
        },
      ],
    );
  });

  it("uses a short fresh cache and bounded stale-on-error fallback", async () => {
    let currentTime = 0;
    let requests = 0;
    const load = createRevenueCatProductGrantCatalog(
      config,
      async (input) => {
        requests += 1;
        if (requests > 2) throw new Error("network details");
        return String(input).includes("virtual_currencies/AIC")
          ? Response.json({
              code: "AIC",
              product_grants: [
                { product_ids: ["product-1"], amount: Number("3") },
              ],
            })
          : Response.json({
              items: [
                {
                  id: "product-1",
                  store_identifier: "bearing_monthly",
                  type: "subscription",
                },
              ],
            });
      },
      () => currentTime,
    );
    await load();
    currentTime = 60_000;
    await load();
    assert.equal(requests, 2);
    currentTime = 6 * 60_000;
    assert.equal((await load())[0].amount, 3);
    currentTime = 16 * 60_000;
    await assert.rejects(
      load(),
      (error: unknown) =>
        error instanceof RevenueCatV2RetryableError &&
        !error.message.includes("network details"),
    );
  });

  it("rejects unsafe joins, malformed grants, and untrusted pagination", async () => {
    for (const grant of [
      { product_ids: ["missing"], amount: Number("1") },
      { product_ids: ["product-1"], amount: Number("1.5") },
    ]) {
      const load = createRevenueCatProductGrantCatalog(config, async (input) =>
        String(input).includes("virtual_currencies/AIC")
          ? Response.json({ code: "AIC", product_grants: [grant] })
          : Response.json({
              items: [
                {
                  id: "product-1",
                  store_identifier: "bearing_monthly",
                  type: "subscription",
                },
              ],
            }),
      );
      await assert.rejects(load(), /invalid/);
    }
    const load = createRevenueCatProductGrantCatalog(config, async () =>
      Response.json({
        items: [],
        next_page: "https://attacker.example/secret",
      }),
    );
    await assert.rejects(load(), /pagination is invalid/);
  });

  it("requires authentication and exposes only the safe projection", async () => {
    await assert.rejects(
      getRevenueCatProductGrantCatalog({}, async () => []),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
    assert.deepEqual(
      await getRevenueCatProductGrantCatalog(
        { auth: { uid: "user-1" } },
        async () => [
          {
            storeProductId: "bearing_monthly",
            productType: "subscription",
            currencyCode: "AIC",
            amount: 4,
            trialAmount: 1,
            expiresAtCycleEnd: false,
          },
        ],
      ),
      {
        products: [
          {
            storeProductId: "bearing_monthly",
            productType: "subscription",
            currencyCode: "AIC",
            amount: 4,
            trialAmount: 1,
            expiresAtCycleEnd: false,
          },
        ],
      },
    );
  });
});
