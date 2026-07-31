import { getAuth } from "firebase-admin/auth";
import {
  DocumentData,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

import { UserDataDeleter, UserDataReader } from "./privacy";

const OWNED_COLLECTIONS = [
  "events",
  "goals",
  "goalSteps",
  "notes",
  "tasks",
] as const;

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

export const readUserDataAdmin: UserDataReader = async (userId) => {
  const db = getFirestore();
  const [profile, subscription, ...collectionSnapshots] = await Promise.all([
    db.doc(`users/${userId}`).get(),
    db.doc(`subscriptions/${userId}`).get(),
    ...OWNED_COLLECTIONS.map((collectionName) =>
      db.collection(collectionName).where("userId", "==", userId).get(),
    ),
  ]);
  const records = Object.fromEntries(
    OWNED_COLLECTIONS.map((collectionName, index) => [
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
    events: records.events ?? [],
    goals: records.goals ?? [],
    goalSteps: records.goalSteps ?? [],
    notes: records.notes ?? [],
    tasks: records.tasks ?? [],
  };
};

export const deleteUserDataAdmin: UserDataDeleter = async (userId) => {
  const db = getFirestore();
  const writer = db.bulkWriter();
  const snapshots = await Promise.all(
    OWNED_COLLECTIONS.map((collectionName) =>
      db.collection(collectionName).where("userId", "==", userId).get(),
    ),
  );

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => writer.delete(document.ref));
  });
  writer.delete(db.doc(`users/${userId}`));
  writer.delete(db.doc(`subscriptions/${userId}`));
  await writer.close();
  await getAuth().deleteUser(userId);
};
