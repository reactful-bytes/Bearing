import { HttpsError } from "firebase-functions/v2/https";

import { CallableIdentityRequest, requireVerifiedCaller } from "./security";

export type TelemetryEvent = {
  schemaVersion: 1;
  name:
    | "ai_goal_plan_result"
    | "auth_result"
    | "calendar_export_result"
    | "calendar_permission_result"
    | "calendar_publication_result"
    | "premium_paywall_viewed"
    | "premium_purchase_started"
    | "premium_purchase_result"
    | "premium_restore_result"
    | "premium_activation_result";
  properties: Record<string, string>;
};

export type TelemetryRequest = CallableIdentityRequest & { data: unknown };
export type TelemetryWriter = (event: TelemetryEvent) => void | Promise<void>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key, index) => actualKeys[index] === key)
  );
}

function isOneOf(value: unknown, values: readonly string[]): value is string {
  return typeof value === "string" && values.includes(value);
}

export function parseTelemetryEvent(data: unknown): TelemetryEvent {
  if (
    !isRecord(data) ||
    !hasExactKeys(data, ["schemaVersion", "name", "properties"]) ||
    data.schemaVersion !== 1 ||
    !isRecord(data.properties)
  ) {
    throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
  }

  const properties = data.properties;
  switch (data.name) {
    case "ai_goal_plan_result":
      if (
        !hasExactKeys(properties, ["outcome"]) ||
        !isOneOf(properties.outcome, ["success", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "auth_result":
      if (
        !hasExactKeys(properties, ["operation", "outcome"]) ||
        !isOneOf(properties.operation, ["account_link", "password_reset"]) ||
        !isOneOf(properties.outcome, ["success", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "calendar_export_result":
      if (
        !hasExactKeys(properties, ["action", "format", "outcome"]) ||
        !isOneOf(properties.action, ["download", "save", "share"]) ||
        !isOneOf(properties.format, ["ics", "json"]) ||
        !isOneOf(properties.outcome, ["success", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "calendar_permission_result":
      if (
        !hasExactKeys(properties, ["outcome"]) ||
        !isOneOf(properties.outcome, [
          "undetermined",
          "granted",
          "denied",
          "blocked",
          "unavailable",
          "failure",
        ])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "calendar_publication_result":
      if (
        !hasExactKeys(properties, ["operation", "outcome"]) ||
        !isOneOf(properties.operation, [
          "create",
          "update",
          "delete",
          "retry",
        ]) ||
        !isOneOf(properties.outcome, ["success", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "premium_paywall_viewed":
      if (
        !hasExactKeys(properties, ["feature"]) ||
        !isOneOf(properties.feature, ["ai_goal_builder", "premium_overview"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "premium_purchase_started":
      if (
        !hasExactKeys(properties, ["period"]) ||
        !isOneOf(properties.period, ["monthly", "annual"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "premium_purchase_result":
      if (
        !hasExactKeys(properties, ["period", "outcome"]) ||
        !isOneOf(properties.period, ["monthly", "annual"]) ||
        !isOneOf(properties.outcome, ["success", "cancelled", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "premium_restore_result":
      if (
        !hasExactKeys(properties, ["outcome"]) ||
        !isOneOf(properties.outcome, ["success", "failure"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    case "premium_activation_result":
      if (
        !hasExactKeys(properties, ["source", "outcome"]) ||
        !isOneOf(properties.source, ["purchase", "restore"]) ||
        !isOneOf(properties.outcome, ["success", "delayed"])
      ) {
        throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
      }
      break;
    default:
      throw new HttpsError("invalid-argument", "Telemetry event is invalid.");
  }

  return {
    schemaVersion: 1,
    name: data.name,
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, String(value)]),
    ),
  } as TelemetryEvent;
}

export async function recordTelemetryEvent(
  request: TelemetryRequest,
  writeEvent: TelemetryWriter,
): Promise<{ recorded: true }> {
  requireVerifiedCaller(request);
  await writeEvent(parseTelemetryEvent(request.data));
  return { recorded: true };
}
