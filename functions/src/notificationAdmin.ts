import { randomUUID } from "node:crypto";
import {
  DocumentData,
  DocumentReference,
  FieldPath,
  FieldValue,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/logger";
import {
  buildReminderCandidates,
  dateInZone,
  readReminderPreferences,
  ReminderCandidate,
  ReminderDevice,
  ReminderEvent,
  ReminderTask,
  REMINDER_SOUNDS,
} from "./notificationSchedule";
import { PushTransportError, readExpoReceipt, sendExpoPush } from "./expoPush";

const MINUTE = 60_000;
const MAX_ATTEMPTS = 3;
const LEASE_MS = 9 * MINUTE;

function requiredDate(value: unknown): Date {
  if (!(value instanceof Timestamp))
    throw new Error("Notification source has an invalid timestamp.");
  return value.toDate();
}

function optionalDate(value: unknown): Date | null {
  return value === undefined || value === null ? null : requiredDate(value);
}

function decodeEvent(id: string, data: DocumentData): ReminderEvent {
  const alarms = (value: unknown): ReminderEvent["alarms"] => {
    if (value === undefined) return [];
    if (!Array.isArray(value))
      throw new Error("Notification source has invalid alarms.");
    return value.map(
      (alarm: { absoluteAt?: unknown; relativeOffsetMinutes?: unknown }) => ({
        absoluteAt: optionalDate(alarm.absoluteAt),
        relativeOffsetMinutes:
          typeof alarm.relativeOffsetMinutes === "number"
            ? alarm.relativeOffsetMinutes
            : null,
      }),
    );
  };
  const rule = data.recurrenceRule;
  const overrides: ReminderEvent["recurrenceOverrides"] = {};
  for (const [date, fields] of Object.entries(data.recurrenceOverrides ?? {})) {
    if (!fields || typeof fields !== "object")
      throw new Error("Invalid recurrence override.");
    const value = fields as DocumentData;
    overrides[date] = { ...value };
    if (value.startAt) overrides[date].startAt = requiredDate(value.startAt);
    if (value.endAt) overrides[date].endAt = requiredDate(value.endAt);
    if (value.alarms) overrides[date].alarms = alarms(value.alarms);
  }
  return {
    id,
    title: data.title,
    startAt: requiredDate(data.startAt),
    endAt: requiredDate(data.endAt),
    timezone: data.timezone,
    allDay: data.allDay === true,
    status: data.status,
    sourceTaskId: data.sourceTaskId ?? null,
    goalId: data.goalId ?? null,
    createdAt: requiredDate(data.createdAt),
    alarms: alarms(data.alarms),
    recurrenceRule: rule
      ? {
          ...rule,
          endAt: optionalDate(rule.endAt),
          weekdays: rule.weekdays ?? [],
          occurrenceCount: rule.occurrenceCount ?? null,
        }
      : null,
    excludedOccurrenceDates: data.excludedOccurrenceDates ?? [],
    recurrenceOverrides: overrides,
  };
}

async function* pages(query: Query): AsyncGenerator<QueryDocumentSnapshot[]> {
  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    const page = await (cursor ? query.startAfter(cursor) : query)
      .limit(100)
      .get();
    if (page.empty) return;
    yield page.docs;
    cursor = page.docs[page.docs.length - 1];
  }
}

async function ownedRecords(
  collection: string,
  userId: string,
): Promise<QueryDocumentSnapshot[]> {
  const documents: QueryDocumentSnapshot[] = [];
  for await (const page of pages(
    getFirestore()
      .collection(collection)
      .where("userId", "==", userId)
      .orderBy(FieldPath.documentId()),
  )) {
    documents.push(...page);
  }
  return documents;
}

async function loadCandidates(
  deviceSnapshot:
    | QueryDocumentSnapshot
    | { id: string; data: () => DocumentData | undefined },
  from: Date,
  until: Date,
): Promise<ReminderCandidate[]> {
  const data = deviceSnapshot.data();
  if (!data || !data.enabled || requiredDate(data.expireAt) <= until) return [];
  const db = getFirestore();
  const [profile, eventDocs, taskDocs, goalDocs] = await Promise.all([
    db.doc(`users/${data.userId}`).get(),
    ownedRecords("events", data.userId),
    ownedRecords("tasks", data.userId),
    ownedRecords("goals", data.userId),
  ]);
  if (!profile.exists || profile.data()?.notificationDeletionPending === true)
    return [];
  const device: ReminderDevice = {
    id: deviceSnapshot.id,
    userId: data.userId,
    timezone: data.timezone,
    enabled: true,
    registeredAt: requiredDate(data.enabledAt),
  };
  const tasks: ReminderTask[] = taskDocs.map((document) => {
    const task = document.data();
    return {
      id: document.id,
      goalId: task.goalId ?? null,
      status: task.status,
      dueDate: optionalDate(task.dueDate),
      dueDateKey:
        task.dueDateKey ??
        (task.dueDate
          ? dateInZone(
              requiredDate(task.dueDate),
              profile.data()?.timezone ?? data.timezone,
            )
          : null),
      createdAt: requiredDate(task.createdAt),
    };
  });
  return buildReminderCandidates(
    device,
    readReminderPreferences(profile.data()?.notifications),
    eventDocs.map((document) => decodeEvent(document.id, document.data())),
    tasks,
    new Map(goalDocs.map((document) => [document.id, document.data().status])),
    from,
    until,
  );
}

async function enqueue(candidate: ReminderCandidate): Promise<void> {
  const ref = getFirestore()
    .collection("notificationDeliveries")
    .doc(candidate.id);
  await getFirestore().runTransaction(async (transaction) => {
    const [existing, device, profile] = await Promise.all([
      transaction.get(ref),
      transaction.get(getFirestore().doc(`pushDevices/${candidate.deviceId}`)),
      transaction.get(getFirestore().doc(`users/${candidate.userId}`)),
    ]);
    if (
      existing.exists ||
      !profile.exists ||
      profile.data()?.notificationDeletionPending === true ||
      device.data()?.userId !== candidate.userId ||
      !device.data()?.enabled
    )
      return;
    const { id, sendAt, expiresAt, ...fields } = candidate;
    transaction.create(ref, {
      ...fields,
      deliveryId: id,
      sendAt: Timestamp.fromDate(sendAt),
      expiresAt: Timestamp.fromDate(expiresAt),
      status: "pending",
      attempts: 0,
      nextActionAt: Timestamp.fromDate(sendAt),
      expireAt: Timestamp.fromMillis(sendAt.getTime() + 30 * 86_400_000),
    });
  });
}

async function finish(ref: DocumentReference, status: string): Promise<void> {
  await ref.update({
    status,
    nextActionAt: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}

function pushData(candidate: ReminderCandidate): Record<string, string> {
  return {
    userId: candidate.userId,
    deliveryId: candidate.id,
    kind: candidate.kind,
    ...(candidate.kind === "event"
      ? {
          eventId: candidate.eventId ?? "",
          dateIso: candidate.startAtIso ?? "",
        }
      : candidate.taskIds?.length === 1
        ? { taskId: candidate.taskIds[0] }
        : {}),
  };
}

async function disableInvalidDevice(
  deviceId: string,
  userId: string,
): Promise<void> {
  const ref = getFirestore().collection("pushDevices").doc(deviceId);
  await getFirestore().runTransaction(async (transaction) => {
    const device = await transaction.get(ref);
    if (device.data()?.userId === userId) transaction.delete(ref);
  });
}

async function processDelivery(
  document: QueryDocumentSnapshot,
  accessToken: string,
  now: Date,
): Promise<void> {
  const db = getFirestore();
  const data = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(document.ref);
    const value = current.data();
    if (!value || !value.nextActionAt || requiredDate(value.nextActionAt) > now)
      return null;
    if (value.status === "sending") {
      transaction.update(document.ref, {
        status: "unknown",
        nextActionAt: FieldValue.delete(),
      });
      logger.error("push_delivery_ambiguous", { deliveryId: document.id });
      return null;
    }
    transaction.update(document.ref, {
      nextActionAt: Timestamp.fromMillis(now.getTime() + LEASE_MS),
    });
    return value;
  });
  if (!data) return;
  if (data.status === "ticket") {
    try {
      const receipt = await readExpoReceipt(data.ticketId, accessToken);
      if (!receipt) {
        const polls = (data.receiptPolls ?? 0) + 1;
        if (polls >= 24) {
          logger.error("push_receipt_unavailable", { deliveryId: document.id });
          await finish(document.ref, "unknown");
        } else
          await document.ref.update({
            receiptPolls: polls,
            nextActionAt: Timestamp.fromMillis(now.getTime() + 60 * MINUTE),
          });
      } else if (receipt.status === "ok")
        await finish(document.ref, "delivered");
      else {
        if (receipt.code === "DeviceNotRegistered")
          await disableInvalidDevice(data.deviceId, data.userId);
        logger.warn("push_receipt_error", {
          deliveryId: document.id,
          code: receipt.code,
        });
        await finish(document.ref, "failed");
      }
    } catch {
      logger.error("push_receipt_request_failed", { deliveryId: document.id });
      const polls = (data.receiptPolls ?? 0) + 1;
      if (polls >= 24) await finish(document.ref, "unknown");
      else
        await document.ref.update({
          receiptPolls: polls,
          nextActionAt: Timestamp.fromMillis(now.getTime() + 60 * MINUTE),
        });
    }
    return;
  }
  if (
    data.status !== "pending" ||
    requiredDate(data.expiresAt) <= now ||
    data.attempts >= MAX_ATTEMPTS
  ) {
    await finish(document.ref, "canceled");
    return;
  }
  const device = await db.collection("pushDevices").doc(data.deviceId).get();
  if (
    !device.exists ||
    device.data()?.userId !== data.userId ||
    !device.data()?.enabled ||
    requiredDate(device.data()?.expireAt) <= now
  ) {
    await finish(document.ref, "canceled");
    return;
  }
  const sendAt = requiredDate(data.sendAt);
  const candidates = await loadCandidates(
    device,
    new Date(sendAt.getTime() - 1),
    sendAt,
  );
  const candidate = candidates.find(
    (item) =>
      item.id === document.id && item.sendAt.getTime() === sendAt.getTime(),
  );
  if (!candidate) {
    await finish(document.ref, "canceled");
    return;
  }
  const profile = await db.doc(`users/${data.userId}`).get();
  const selectedSound = profile.data()?.reminderSoundId;
  const sound =
    REMINDER_SOUNDS.find((id) => id === selectedSound) ?? "signal-pulse";
  await document.ref.update({ status: "sending", attempts: data.attempts + 1 });
  try {
    const ticket = await sendExpoPush(
      {
        to: device.data()?.token,
        title: candidate.title,
        body: candidate.body,
        data: pushData(candidate),
        sound: `${sound.replaceAll("-", "_")}.wav`,
        channelId: `bearing-reminders-${sound}-v1`,
        priority: "normal",
        ttl: Math.max(
          1,
          Math.floor((candidate.expiresAt.getTime() - now.getTime()) / 1000),
        ),
      },
      accessToken,
    );
    if (ticket.status === "ok") {
      await document.ref.update({
        status: "ticket",
        ticketId: ticket.id,
        receiptPolls: 0,
        nextActionAt: Timestamp.fromMillis(now.getTime() + 15 * MINUTE),
      });
    } else if (
      ticket.code === "MessageRateExceeded" &&
      data.attempts + 1 < MAX_ATTEMPTS
    ) {
      await document.ref.update({
        status: "pending",
        nextActionAt: Timestamp.fromMillis(
          now.getTime() + MINUTE * 2 ** data.attempts,
        ),
      });
    } else {
      if (ticket.code === "DeviceNotRegistered")
        await disableInvalidDevice(data.deviceId, data.userId);
      logger.warn("push_ticket_error", {
        deliveryId: document.id,
        code: ticket.code,
      });
      await finish(document.ref, "failed");
    }
  } catch (error) {
    logger.error("push_send_failed", {
      deliveryId: document.id,
      ambiguous: !(error instanceof PushTransportError) || error.ambiguous,
    });
    if (
      error instanceof PushTransportError &&
      error.retryable &&
      !error.ambiguous &&
      data.attempts + 1 < MAX_ATTEMPTS
    ) {
      await document.ref.update({
        status: "pending",
        nextActionAt: Timestamp.fromMillis(
          now.getTime() + MINUTE * 2 ** data.attempts,
        ),
      });
    } else
      await finish(
        document.ref,
        error instanceof PushTransportError && !error.ambiguous
          ? "failed"
          : "unknown",
      );
  }
}

export async function runNotificationScheduler(
  accessToken: string,
  now = new Date(),
): Promise<void> {
  if (!accessToken) throw new Error("Expo push access token is required.");
  const db = getFirestore();
  const lock = db.doc("notificationSystem/scheduler");
  const owner = randomUUID();
  const acquired = await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(lock)).data();
    if (data?.leaseUntil && requiredDate(data.leaseUntil) > now) return false;
    transaction.set(lock, {
      owner,
      leaseUntil: Timestamp.fromMillis(now.getTime() + LEASE_MS),
    });
    return true;
  });
  if (!acquired) return;
  let failures = 0;
  let firstFailure: unknown;
  try {
    const from = new Date(now.getTime() - 10 * MINUTE);
    for await (const page of pages(
      db
        .collection("pushDevices")
        .where("enabled", "==", true)
        .orderBy(FieldPath.documentId()),
    )) {
      for (const device of page) {
        try {
          for (const candidate of await loadCandidates(device, from, now)) {
            if (candidate.expiresAt > now) await enqueue(candidate);
          }
        } catch (error) {
          failures += 1;
          firstFailure ??= error;
          logger.error("push_planning_failed", { deviceId: device.id });
        }
      }
    }
    for await (const page of pages(
      db
        .collection("notificationDeliveries")
        .where("nextActionAt", "<=", Timestamp.fromDate(now))
        .orderBy("nextActionAt")
        .orderBy(FieldPath.documentId()),
    )) {
      for (const delivery of page) {
        try {
          await processDelivery(delivery, accessToken, new Date());
        } catch (error) {
          failures += 1;
          firstFailure ??= error;
          logger.error("push_delivery_processing_failed", {
            deliveryId: delivery.id,
          });
        }
      }
    }
    if (failures)
      throw new Error(
        `${failures} notification processing operations failed; see sanitized logs.`,
        { cause: firstFailure },
      );
  } finally {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(lock);
      if (current.data()?.owner === owner) transaction.delete(lock);
    });
  }
}
