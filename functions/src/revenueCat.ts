import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuth } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

export type RevenueCatSubscriptionStatus =
  "active" | "in_grace_period" | "expired" | "canceled";

type RevenueCatEntitlement = {
  expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string | null;
};

type RevenueCatSubscription = {
  billing_issues_detected_at?: string | null;
  expires_date?: string | null;
  purchase_date?: string | null;
  store?: string;
  unsubscribe_detected_at?: string | null;
};

export type RevenueCatSubscriber = {
  entitlements?: Record<string, RevenueCatEntitlement>;
  subscriptions?: Record<string, RevenueCatSubscription>;
};

export type SubscriptionRecord = {
  userId: string;
  platform: "ios" | "android" | "web";
  productId: string;
  status: RevenueCatSubscriptionStatus;
  periodStartAt: Timestamp | null;
  periodEndAt: Timestamp | null;
  autoRenew: boolean;
  lastValidatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type WebhookRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer;
  body?: unknown;
};

type WebhookResponse = {
  status: (statusCode: number) => WebhookResponse;
  json: (body: unknown) => void;
};

type WebhookEvent = { id: string; appUserId: string };

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toTimestamp(value: string | null | undefined): Timestamp | null {
  const parsed = parseDate(value);
  return parsed ? Timestamp.fromDate(parsed) : null;
}

function platformForStore(
  store: string | undefined,
): SubscriptionRecord["platform"] {
  if (store === "APP_STORE" || store === "MAC_APP_STORE") return "ios";
  if (store === "PLAY_STORE") return "android";
  return "web";
}

export function mapRevenueCatSubscription(
  userId: string,
  subscriber: RevenueCatSubscriber,
  now = new Date(),
): SubscriptionRecord {
  const entitlement = subscriber.entitlements?.premium;
  const entitlementEnd = parseDate(entitlement?.expires_date);
  const isActive =
    entitlementEnd === null || entitlementEnd.getTime() > now.getTime();
  const productId = entitlement?.product_identifier ?? "";
  const subscription = productId
    ? subscriber.subscriptions?.[productId]
    : undefined;
  const hasBillingIssue = Boolean(subscription?.billing_issues_detected_at);
  const wasCanceled = Boolean(subscription?.unsubscribe_detected_at);
  const timestamp = Timestamp.fromDate(now);

  return {
    userId,
    platform: platformForStore(subscription?.store),
    productId,
    status: entitlement
      ? isActive
        ? hasBillingIssue
          ? "in_grace_period"
          : "active"
        : wasCanceled
          ? "canceled"
          : "expired"
      : "expired",
    periodStartAt: toTimestamp(
      subscription?.purchase_date ?? entitlement?.purchase_date,
    ),
    periodEndAt: toTimestamp(
      subscription?.expires_date ?? entitlement?.expires_date,
    ),
    autoRenew: Boolean(subscription && !subscription.unsubscribe_detected_at),
    lastValidatedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function headerValue(
  headers: WebhookRequest["headers"],
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function verifyRevenueCatWebhook(
  request: WebhookRequest,
  authorization: string,
  signingSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (request.method !== "POST" || !request.rawBody) return false;
  if (headerValue(request.headers, "authorization") !== authorization)
    return false;

  const signatureHeader = headerValue(
    request.headers,
    "x-revenuecat-webhook-signature",
  );
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=", 2)),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (
    !Number.isFinite(timestamp) ||
    !signature ||
    Math.abs(nowSeconds - timestamp) > 300
  ) {
    return false;
  }

  const expected = createHmac("sha256", signingSecret)
    .update(`${timestamp}.`)
    .update(request.rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function parseRevenueCatWebhookEvent(body: unknown): WebhookEvent {
  if (!body || typeof body !== "object" || !("event" in body)) {
    throw new Error("Webhook payload is invalid.");
  }
  const event = (body as { event?: unknown }).event;
  if (!event || typeof event !== "object")
    throw new Error("Webhook event is invalid.");
  const eventRecord = event as Record<string, unknown>;
  if (
    typeof eventRecord.id !== "string" ||
    typeof eventRecord.app_user_id !== "string"
  ) {
    throw new Error("Webhook event identity is invalid.");
  }
  if (
    !eventRecord.app_user_id ||
    eventRecord.app_user_id.startsWith("$RCAnonymousID:")
  ) {
    throw new Error("Webhook customer is not a Firebase account.");
  }
  return { id: eventRecord.id, appUserId: eventRecord.app_user_id };
}

export async function fetchRevenueCatSubscriber(
  userId: string,
  apiKey: string,
): Promise<RevenueCatSubscriber> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!response.ok)
    throw new Error(`RevenueCat subscriber lookup failed: ${response.status}`);
  const payload = (await response.json()) as {
    subscriber?: RevenueCatSubscriber;
  };
  if (!payload.subscriber)
    throw new Error("RevenueCat subscriber response is invalid.");
  return payload.subscriber;
}

export async function deleteRevenueCatCustomer(
  userId: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`RevenueCat customer deletion failed: ${response.status}`);
  }
}

export async function handleRevenueCatWebhook(
  request: WebhookRequest,
  response: WebhookResponse,
  secrets: { authorization: string; signingSecret: string; apiKey: string },
): Promise<void> {
  if (
    !verifyRevenueCatWebhook(
      request,
      secrets.authorization,
      secrets.signingSecret,
    )
  ) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  let event: WebhookEvent;
  try {
    event = parseRevenueCatWebhookEvent(request.body);
  } catch {
    response.status(400).json({ error: "Invalid event." });
    return;
  }

  const db = getFirestore();
  const receiptRef = db.doc(`revenueCatWebhookEvents/${event.id}`);
  if ((await receiptRef.get()).exists) {
    response.status(200).json({ received: true, duplicate: true });
    return;
  }

  await getAuth().getUser(event.appUserId);
  const subscriber = await fetchRevenueCatSubscriber(
    event.appUserId,
    secrets.apiKey,
  );
  const subscription = mapRevenueCatSubscription(event.appUserId, subscriber);
  const subscriptionRef = db.doc(`subscriptions/${event.appUserId}`);
  await db.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return;
    const existingSubscription = await transaction.get(subscriptionRef);
    const existingCreatedAt = existingSubscription.data()?.createdAt;
    transaction.set(subscriptionRef, {
      ...subscription,
      createdAt:
        existingCreatedAt instanceof Timestamp
          ? existingCreatedAt
          : subscription.createdAt,
    });
    transaction.set(receiptRef, {
      userId: event.appUserId,
      receivedAt: Timestamp.now(),
    });
  });
  response.status(200).json({ received: true });
}
