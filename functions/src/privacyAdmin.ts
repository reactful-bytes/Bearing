import { getAuth } from "firebase-admin/auth";
import {
  DocumentData,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

import { UserDataDeleter, UserDataReader } from "./privacy";
import { getAiCreditLockId } from "./aiCreditOperations";
import { deleteRevenueCatCustomer } from "./revenueCat";
import {
  RevenueCatV2Config,
  getRevenueCatVirtualCurrencyBalance,
} from "./revenueCatV2";

export const OWNED_COLLECTIONS = [
  "events",
  "goals",
  "milestones",
  "notes",
  "tasks",
] as const;

export const AI_CREDIT_QUERY_COLLECTIONS = ["aiCreditOperations"] as const;
export const NOTIFICATION_QUERY_COLLECTIONS = [
  "pushDevices",
  "notificationDeliveries",
] as const;

export function redactPushDevice(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid device export record.");
  }
  const portable: Record<string, unknown> = { ...value };
  delete portable.token;
  return portable;
}

function toPortableValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toPortableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        toPortableValue(nestedValue),
      ]),
    );
  }

  return value;
}

function portableDocument(id: string, data: DocumentData): unknown {
  return toPortableValue({ id, ...data });
}

const readLocalUserDataAdmin = async (userId: string) => {
  const db = getFirestore();
  const [profile, subscription, aiCreditLock, ...collectionSnapshots] =
    await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.doc(`subscriptions/${userId}`).get(),
      db.doc(`aiCreditLocks/${getAiCreditLockId(userId)}`).get(),
      ...[
        ...OWNED_COLLECTIONS,
        ...AI_CREDIT_QUERY_COLLECTIONS,
        ...NOTIFICATION_QUERY_COLLECTIONS,
      ].map((collectionName) =>
        db.collection(collectionName).where("userId", "==", userId).get(),
      ),
    ]);
  const queryCollections = [
    ...OWNED_COLLECTIONS,
    ...AI_CREDIT_QUERY_COLLECTIONS,
    ...NOTIFICATION_QUERY_COLLECTIONS,
  ];
  const records = Object.fromEntries(
    queryCollections.map((collectionName, index) => [
      collectionName,
      collectionSnapshots[index].docs.map((document) =>
        portableDocument(document.id, document.data()),
      ),
    ]),
  );

  return {
    userId,
    profile: profile.exists
      ? portableDocument(profile.id, profile.data() ?? {})
      : null,
    subscription: subscription.exists
      ? portableDocument(subscription.id, subscription.data() ?? {})
      : null,
    aiCreditLock: aiCreditLock.exists
      ? portableDocument(aiCreditLock.id, aiCreditLock.data() ?? {})
      : null,
    aiCreditOperations: records.aiCreditOperations ?? [],
    events: records.events ?? [],
    goals: records.goals ?? [],
    milestones: records.milestones ?? [],
    notes: records.notes ?? [],
    tasks: records.tasks ?? [],
    pushDevices: (records.pushDevices ?? []).map(redactPushDevice),
    notificationDeliveries: records.notificationDeliveries ?? [],
  };
};

export function createUserDataAdminReader(
  config: RevenueCatV2Config,
  readLocalUserData: typeof readLocalUserDataAdmin = readLocalUserDataAdmin,
  readBalance: typeof getRevenueCatVirtualCurrencyBalance = getRevenueCatVirtualCurrencyBalance,
): UserDataReader {
  return async (userId) => {
    const [localData, balance] = await Promise.all([
      readLocalUserData(userId),
      readBalance(userId, config),
    ]);
    return { ...localData, aiCreditBalance: balance.balance };
  };
}

async function deleteLocalUserData(userId: string): Promise<void> {
  const db = getFirestore();
  await db
    .doc(`users/${userId}`)
    .set({ notificationDeletionPending: true }, { merge: true });
  const devices = await db
    .collection("pushDevices")
    .where("userId", "==", userId)
    .get();
  const deviceWriter = db.bulkWriter();
  devices.docs.forEach((device) =>
    deviceWriter.update(device.ref, { enabled: false }),
  );
  await deviceWriter.close();
  const writer = db.bulkWriter();
  const snapshots = await Promise.all(
    [
      ...OWNED_COLLECTIONS,
      ...AI_CREDIT_QUERY_COLLECTIONS,
      ...NOTIFICATION_QUERY_COLLECTIONS,
    ].map((collectionName) =>
      db.collection(collectionName).where("userId", "==", userId).get(),
    ),
  );

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => writer.delete(document.ref));
  });
  writer.delete(db.doc(`users/${userId}`));
  writer.delete(db.doc(`subscriptions/${userId}`));
  writer.delete(db.doc(`aiCreditLocks/${getAiCreditLockId(userId)}`));
  await writer.close();
  await getAuth().deleteUser(userId);
}

export async function deleteUserDataWithProcessorCleanup(
  userId: string,
  deleteProcessorData: (userId: string) => Promise<void>,
  deleteLocalData: (userId: string) => Promise<void>,
): Promise<void> {
  await deleteProcessorData(userId);
  await deleteLocalData(userId);
}

export function createUserDataAdminDeleter(
  revenueCatApiKey: string,
): UserDataDeleter {
  return (userId) =>
    deleteUserDataWithProcessorCleanup(
      userId,
      (targetUserId) =>
        deleteRevenueCatCustomer(targetUserId, revenueCatApiKey),
      deleteLocalUserData,
    );
}
