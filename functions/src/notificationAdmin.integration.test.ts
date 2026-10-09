import assert from "node:assert/strict";
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
  mock,
} from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { runNotificationScheduler } from "./notificationAdmin";
import {
  disablePushDeviceHandler,
  registerPushDeviceHandler,
} from "./pushDevices";
import { reminderId } from "./notificationSchedule";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = "bearing-rules-test";
const now = new Date();
const sendAt = new Date(now.getTime() - 30_000);
const startAt = new Date(sendAt.getTime() + 5 * 60_000);
const userId = "notification-integration-user";
const deviceId = "notification-integration-device";
const deliveryId = reminderId([
  deviceId,
  "event",
  "notification-integration-event",
  startAt.toISOString().slice(0, 10),
  "-5",
  sendAt.toISOString(),
]);
let app: ReturnType<typeof initializeApp>;

describe(
  "durable push processing against the Firestore emulator",
  { skip: !emulatorHost },
  () => {
    before(() => {
      if (!emulatorHost)
        throw new Error(
          "Firestore emulator is required; never run against a live project.",
        );
      app = initializeApp({ projectId });
    });
    after(async () => {
      await deleteApp(app);
    });
    afterEach(() => mock.restoreAll());
    beforeEach(async () => {
      const db = getFirestore();
      for (const collection of [
        "users",
        "events",
        "tasks",
        "goals",
        "pushDevices",
        "notificationDeliveries",
        "notificationSystem",
      ]) {
        await db.recursiveDelete(db.collection(collection));
      }
      await db
        .doc(`users/${userId}`)
        .set({ timezone: "UTC", reminderSoundId: "steady-bell" });
      await db.doc(`pushDevices/${deviceId}`).set({
        userId,
        token: "ExpoPushToken[test-device]",
        enabled: true,
        timezone: "UTC",
        enabledAt: Timestamp.fromMillis(now.getTime() - 86_400_000),
        expireAt: Timestamp.fromMillis(now.getTime() + 90 * 86_400_000),
      });
      await db.doc("events/notification-integration-event").set({
        userId,
        title: "Planning",
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromMillis(startAt.getTime() + 60 * 60_000),
        timezone: "UTC",
        status: "scheduled",
        alarms: [{ relativeOffsetMinutes: -5, absoluteAt: null }],
        createdAt: Timestamp.fromMillis(now.getTime() - 86_400_000),
      });
    });

    it("persists one ticket, avoids duplicate sends, selects sound/channel and checks receipts", async () => {
      const fetchMock = mock.method(
        globalThis,
        "fetch",
        async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
          if (String(input).endsWith("getReceipts")) {
            return new Response(
              JSON.stringify({ data: { "ticket-1": { status: "ok" } } }),
            );
          }
          const [message] = JSON.parse(String(init?.body));
          assert.equal(message.sound, "steady_bell.wav");
          assert.equal(message.channelId, "bearing-reminders-steady-bell-v1");
          assert.equal(message.data.eventId, "notification-integration-event");
          assert.equal(message.data.userId, userId);
          assert.equal(message.priority, "normal");
          assert.ok(message.ttl > 0 && message.ttl <= 600);
          return new Response(
            JSON.stringify({ data: [{ status: "ok", id: "ticket-1" }] }),
          );
        },
      );
      await runNotificationScheduler("test-secret", now);
      await runNotificationScheduler("test-secret", now);
      assert.equal(fetchMock.mock.callCount(), 1);
      const ref = getFirestore().doc(`notificationDeliveries/${deliveryId}`);
      assert.equal((await ref.get()).data()?.status, "ticket");
      await ref.update({
        nextActionAt: Timestamp.fromMillis(now.getTime() - 1),
      });
      await runNotificationScheduler("test-secret", now);
      assert.equal((await ref.get()).data()?.status, "delivered");
      assert.equal((await ref.get()).data()?.nextActionAt, undefined);
    });

    it("revalidates canceled events before retry", async () => {
      const fetchMock = mock.method(
        globalThis,
        "fetch",
        async () => new Response("", { status: 429 }),
      );
      await runNotificationScheduler("test-secret", now);
      const ref = getFirestore().doc(`notificationDeliveries/${deliveryId}`);
      assert.equal((await ref.get()).data()?.status, "pending");
      await getFirestore()
        .doc("events/notification-integration-event")
        .update({ status: "canceled" });
      await ref.update({
        nextActionAt: Timestamp.fromMillis(now.getTime() - 1),
      });
      await runNotificationScheduler("test-secret", now);
      assert.equal((await ref.get()).data()?.status, "canceled");
      assert.equal(fetchMock.mock.callCount(), 1);
    });

    for (const mutation of [
      "delete-event",
      "disable-device",
      "expire-device",
      "expire-reminder",
      "exhaust-retries",
    ]) {
      it(`suppresses stale queued work: ${mutation}`, async () => {
        const fetchMock = mock.method(
          globalThis,
          "fetch",
          async () => new Response("", { status: 429 }),
        );
        await runNotificationScheduler("test-secret", now);
        const db = getFirestore();
        const ref = db.doc(`notificationDeliveries/${deliveryId}`);
        await ref.update({
          nextActionAt: Timestamp.fromMillis(now.getTime() - 1),
        });
        if (mutation === "delete-event")
          await db.doc("events/notification-integration-event").delete();
        if (mutation === "disable-device")
          await db.doc(`pushDevices/${deviceId}`).update({ enabled: false });
        if (mutation === "expire-device")
          await db.doc(`pushDevices/${deviceId}`).update({
            expireAt: Timestamp.fromMillis(now.getTime() - 10_000),
          });
        if (mutation === "expire-reminder")
          await ref.update({
            expiresAt: Timestamp.fromMillis(now.getTime() - 1),
          });
        if (mutation === "exhaust-retries") await ref.update({ attempts: 3 });
        await runNotificationScheduler("test-secret", now);
        assert.equal(fetchMock.mock.callCount(), 1);
        assert.equal((await ref.get()).data()?.status, "canceled");
      });
    }

    it("suppresses task-linked reminders immediately after completion", async () => {
      const db = getFirestore();
      await db
        .doc("events/notification-integration-event")
        .update({ sourceTaskId: "task-1" });
      await db.doc("tasks/task-1").set({
        userId,
        status: "completed",
        createdAt: Timestamp.fromMillis(now.getTime() - 86_400_000),
      });
      const fetchMock = mock.method(globalThis, "fetch", async () => {
        throw new Error("Must not send");
      });
      await runNotificationScheduler("test-secret", now);
      assert.equal(fetchMock.mock.callCount(), 0);
      assert.equal(
        (await db.doc(`notificationDeliveries/${deliveryId}`).get()).exists,
        false,
      );
    });

    it("disables invalid tokens after provider errors", async () => {
      mock.method(
        globalThis,
        "fetch",
        async () =>
          new Response(
            JSON.stringify({
              data: [
                { status: "error", details: { error: "DeviceNotRegistered" } },
              ],
            }),
          ),
      );
      await runNotificationScheduler("test-secret", now);
      assert.equal(
        (await getFirestore().doc(`pushDevices/${deviceId}`).get()).exists,
        false,
      );
      assert.equal(
        (
          await getFirestore().doc(`notificationDeliveries/${deliveryId}`).get()
        ).data()?.status,
        "failed",
      );
    });

    it("does not blindly retry ambiguous sends", async () => {
      const fetchMock = mock.method(globalThis, "fetch", async () => {
        throw new Error("Connection closed after write");
      });
      await runNotificationScheduler("test-secret", now);
      await runNotificationScheduler("test-secret", now);
      assert.equal(fetchMock.mock.callCount(), 1);
      assert.equal(
        (
          await getFirestore().doc(`notificationDeliveries/${deliveryId}`).get()
        ).data()?.status,
        "unknown",
      );
    });

    it("serializes overlapping scheduler invocations", async () => {
      await getFirestore()
        .doc("notificationSystem/scheduler")
        .set({
          owner: "other-worker",
          leaseUntil: Timestamp.fromMillis(now.getTime() + 60_000),
        });
      const fetchMock = mock.method(globalThis, "fetch", async () => {
        throw new Error("Must not send");
      });
      await runNotificationScheduler("test-secret", now);
      assert.equal(fetchMock.mock.callCount(), 0);
    });

    it("blocks new registration and delivery while account deletion is pending", async () => {
      await getFirestore()
        .doc(`users/${userId}`)
        .update({ notificationDeletionPending: true });
      const fetchMock = mock.method(globalThis, "fetch", async () => {
        throw new Error("Must not send");
      });
      await runNotificationScheduler("test-secret", now);
      assert.equal(fetchMock.mock.callCount(), 0);
      await assert.rejects(
        registerPushDeviceHandler({
          auth: { uid: userId },
          data: {
            token: "ExpoPushToken[registration-test]",
            installationId: "installation-123456789",
            timezone: "UTC",
          },
        }),
      );
    });

    it("registers authenticated devices, refreshes timezone without resetting consent, and enforces disable ownership", async () => {
      const input = {
        token: "ExpoPushToken[registration-test]",
        installationId: "installation-123456789",
        timezone: "America/Chicago",
      };
      const registered = await registerPushDeviceHandler({
        auth: { uid: userId },
        data: input,
      });
      const ref = getFirestore().doc(`pushDevices/${registered.deviceId}`);
      const enabledAt = (await ref.get()).data()?.enabledAt.toMillis();
      await registerPushDeviceHandler({
        auth: { uid: userId },
        data: { ...input, timezone: "Pacific/Honolulu" },
      });
      assert.equal((await ref.get()).data()?.timezone, "Pacific/Honolulu");
      assert.equal((await ref.get()).data()?.enabledAt.toMillis(), enabledAt);
      await disablePushDeviceHandler({
        auth: { uid: "other-user" },
        data: { installationId: input.installationId },
      });
      assert.equal((await ref.get()).data()?.enabled, true);
      await assert.rejects(
        disablePushDeviceHandler({
          auth: { uid: "other-user" },
          data: registered,
        }),
      );
      await disablePushDeviceHandler({
        auth: { uid: userId },
        data: registered,
      });
      assert.equal((await ref.get()).data()?.enabled, false);
      await registerPushDeviceHandler({ auth: { uid: userId }, data: input });
      await disablePushDeviceHandler({
        auth: { uid: userId },
        data: { installationId: input.installationId },
      });
      assert.equal((await ref.get()).data()?.enabled, false);
    });
  },
);
