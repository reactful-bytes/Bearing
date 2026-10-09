import { createHash } from "node:crypto";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

export type PushDeviceInput = {
  token: string;
  installationId: string;
  timezone: string;
};

export function parsePushDeviceInput(value: unknown): PushDeviceInput {
  if (!value || typeof value !== "object")
    throw new HttpsError(
      "invalid-argument",
      "Device registration is required.",
    );
  const input = value as Record<string, unknown>;
  if (
    typeof input.token !== "string" ||
    !/^(Expo|Exponent)PushToken\[[\w-]+\]$/.test(input.token) ||
    input.token.length > 256 ||
    typeof input.installationId !== "string" ||
    !/^[\w-]{16,80}$/.test(input.installationId) ||
    typeof input.timezone !== "string" ||
    input.timezone.length > 80
  )
    throw new HttpsError("invalid-argument", "Invalid push registration.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format();
  } catch (error) {
    throw new HttpsError("invalid-argument", "Device timezone is invalid.", {
      cause: error instanceof Error ? error.name : "unknown",
    });
  }
  return {
    token: input.token,
    installationId: input.installationId,
    timezone: input.timezone,
  };
}

export async function registerPushDeviceHandler(
  request: CallableIdentityRequest & { data: unknown },
): Promise<{ deviceId: string }> {
  const { uid } = requireAuthenticatedCaller(request);
  const input = parsePushDeviceInput(request.data);
  const db = getFirestore();
  const deviceId = createHash("sha256").update(input.token).digest("hex");
  const ref = db.collection("pushDevices").doc(deviceId);
  await db.runTransaction(async (transaction) => {
    const [snapshot, previousDevices, profile] = await Promise.all([
      transaction.get(ref),
      transaction.get(
        db
          .collection("pushDevices")
          .where("installationId", "==", input.installationId),
      ),
      transaction.get(db.doc(`users/${uid}`)),
    ]);
    if (!profile.exists || profile.data()?.notificationDeletionPending === true)
      throw new HttpsError(
        "failed-precondition",
        "Create your profile before enabling notifications.",
      );
    const previous = snapshot.data();
    const now = Timestamp.now();
    previousDevices.docs.forEach((device) => {
      if (device.id !== deviceId && device.data().userId === uid)
        transaction.delete(device.ref);
    });
    transaction.set(ref, {
      userId: uid,
      token: input.token,
      installationId: input.installationId,
      timezone: input.timezone,
      enabled: true,
      enabledAt:
        previous?.userId === uid && previous.enabled ? previous.enabledAt : now,
      updatedAt: now,
      expireAt: Timestamp.fromMillis(now.toMillis() + 90 * 86_400_000),
    });
  });
  return { deviceId };
}

export async function disablePushDeviceHandler(
  request: CallableIdentityRequest & { data: unknown },
): Promise<{ disabled: true }> {
  const { uid } = requireAuthenticatedCaller(request);
  const data = request.data;
  if (
    data &&
    typeof data === "object" &&
    "installationId" in data &&
    typeof data.installationId === "string" &&
    /^[\w-]{16,80}$/.test(data.installationId)
  ) {
    const db = getFirestore();
    const query = db
      .collection("pushDevices")
      .where("installationId", "==", data.installationId);
    await db.runTransaction(async (transaction) => {
      const devices = await transaction.get(query);
      devices.docs.forEach((device) => {
        if (device.data().userId === uid) {
          transaction.update(device.ref, {
            enabled: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
    });
    return { disabled: true };
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("deviceId" in data) ||
    typeof data.deviceId !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.deviceId)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A valid registered device is required.",
    );
  }
  const ref = getFirestore().collection("pushDevices").doc(data.deviceId);
  await getFirestore().runTransaction(async (transaction) => {
    const device = await transaction.get(ref);
    if (!device.exists) return;
    if (device.data()?.userId !== uid)
      throw new HttpsError(
        "permission-denied",
        "This device belongs to another account.",
      );
    transaction.update(ref, {
      enabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { disabled: true };
}
