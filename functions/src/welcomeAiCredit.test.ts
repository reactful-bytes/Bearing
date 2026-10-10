import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getWelcomeAiCreditErrorLogContext,
  WelcomeAiCreditDependencies,
  grantWelcomeAiCredit,
} from "./welcomeAiCredit";

function dependencies(providerId = "password"): WelcomeAiCreditDependencies {
  return {
    loadUser: async () => ({
      providerData: [{ providerId }],
    }),
    ensureCustomer: async () => undefined,
    grant: async () => undefined,
    markGranted: async () => undefined,
  };
}

describe("welcome AI credit", () => {
  it("logs safe failure metadata without exposing raw error messages", () => {
    assert.deepEqual(
      getWelcomeAiCreditErrorLogContext(
        new Error("RevenueCat customer creation failed: 403"),
      ),
      {
        errorType: "Error",
        operation: "revenuecat_customer_creation",
        httpStatus: 403,
      },
    );

    const error = Object.assign(new Error("sensitive user or token details"), {
      code: "auth/internal",
    });
    const context = getWelcomeAiCreditErrorLogContext(error);
    assert.deepEqual(context, {
      errorType: "Error",
      errorCode: "auth/internal",
    });
    assert.equal(JSON.stringify(context).includes(error.message), false);
  });

  it("grants email and Google accounts on first profile creation regardless of Auth account age", async () => {
    for (const provider of ["password", "google.com"]) {
      const calls: string[] = [];
      const deps = dependencies(provider);
      deps.ensureCustomer = async (uid) => {
        calls.push(`ensure:${uid}`);
      };
      deps.grant = async (uid, key, amount) => {
        calls.push(`grant:${uid}:${amount}:${key}`);
      };
      deps.markGranted = async (uid) => {
        calls.push(`mark:${uid}`);
      };
      assert.equal(await grantWelcomeAiCredit("new-user", deps), "granted");
      assert.equal(calls[0], "ensure:new-user");
      assert.match(calls[1], /^grant:new-user:2:[a-f0-9]{64}$/);
      assert.equal(calls[2], "mark:new-user");
    }
  });

  it("excludes anonymous accounts", async () => {
    for (const deps of [dependencies("anonymous")]) {
      deps.ensureCustomer = async () => {
        throw new Error("must not create customer");
      };
      deps.grant = async () => {
        throw new Error("must not grant");
      };
      assert.equal(await grantWelcomeAiCredit("user", deps), "ineligible");
    }
  });

  it("reuses the key for duplicate delivery, profile recreation, and retry after an uncertain grant", async () => {
    const keys: string[] = [];
    const applied = new Set<string>();
    const deps = dependencies();
    deps.grant = async (_uid, key) => {
      keys.push(key);
      applied.add(key);
      if (keys.length === 1) throw new Error("response lost");
    };
    await assert.rejects(grantWelcomeAiCredit("user", deps), /response lost/);
    await Promise.all([
      grantWelcomeAiCredit("user", deps),
      grantWelcomeAiCredit("user", deps),
    ]);
    assert.equal(applied.size, 1);
    deps.grant = async (_uid, key) => {
      keys.push(key);
    };
    await grantWelcomeAiCredit("different-user", deps);
    assert.notEqual(keys[0], keys[3]);
  });

  it("does not grant after a deleted account and retries other Auth failures", async () => {
    const deps = dependencies();
    deps.loadUser = async () => {
      throw { code: "auth/user-not-found" };
    };
    assert.equal(await grantWelcomeAiCredit("user", deps), "deleted");
    deps.loadUser = async () => {
      throw new Error("Auth unavailable");
    };
    await assert.rejects(
      grantWelcomeAiCredit("user", deps),
      /Auth unavailable/,
    );
  });
});
