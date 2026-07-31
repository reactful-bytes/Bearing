import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { TelemetryEvent, recordTelemetryEvent } from "./telemetry";

const verifiedRequest = {
  app: { appId: "bearing-app" },
  auth: { uid: "user-1" },
};

describe("telemetry callable", () => {
  it("records an allowlisted event without caller identity", async () => {
    let writtenEvent: TelemetryEvent | null = null;
    const data = {
      schemaVersion: 1 as const,
      name: "calendar_export_result",
      properties: { action: "share", format: "ics", outcome: "success" },
    };

    assert.deepEqual(
      await recordTelemetryEvent({ ...verifiedRequest, data }, (event) => {
        writtenEvent = event;
      }),
      { recorded: true },
    );
    assert.deepEqual(writtenEvent, data);
    assert.equal("uid" in (writtenEvent ?? {}), false);
  });

  it("rejects extra sensitive properties before writing", async () => {
    let writeStarted = false;

    await assert.rejects(
      recordTelemetryEvent(
        {
          ...verifiedRequest,
          data: {
            schemaVersion: 1,
            name: "premium_paywall_viewed",
            properties: {
              feature: "premium_overview",
              email: "private@example.com",
            },
          },
        },
        () => {
          writeStarted = true;
        },
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
    assert.equal(writeStarted, false);
  });

  it("rejects extra top-level fields before writing", async () => {
    let writeStarted = false;

    await assert.rejects(
      recordTelemetryEvent(
        {
          ...verifiedRequest,
          data: {
            schemaVersion: 1,
            name: "ai_goal_plan_result",
            properties: { outcome: "success" },
            email: "private@example.com",
          },
        },
        () => {
          writeStarted = true;
        },
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
    assert.equal(writeStarted, false);
  });

  it("requires an authenticated App Check caller", async () => {
    await assert.rejects(
      recordTelemetryEvent(
        {
          data: {
            schemaVersion: 1,
            name: "ai_goal_plan_result",
            properties: { outcome: "success" },
          },
        },
        () => undefined,
      ),
      (error: unknown) => error instanceof HttpsError,
    );
  });

  it("preserves an undetermined calendar permission outcome", async () => {
    let writtenEvent: TelemetryEvent | null = null;
    await recordTelemetryEvent(
      {
        ...verifiedRequest,
        data: {
          schemaVersion: 1,
          name: "calendar_permission_result",
          properties: { outcome: "undetermined" },
        },
      },
      (event) => {
        writtenEvent = event;
      },
    );
    assert.deepEqual(writtenEvent, {
      schemaVersion: 1,
      name: "calendar_permission_result",
      properties: { outcome: "undetermined" },
    });
  });
});
