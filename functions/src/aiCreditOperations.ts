import { createHash } from "node:crypto";

import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import {
  RevenueCatV2RetryableError,
  RevenueCatVirtualCurrencyExhaustedError,
} from "./revenueCatV2";

const OPERATION_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_LEASE_MS = 2 * 60 * 1000;

export type AiCreditOperationState =
  | "debit_pending"
  | "debited"
  | "refund_pending"
  | "refunded"
  | "completed"
  | "exhausted";

export type AiCreditOperation = {
  id: string;
  userId: string;
  requestId: string;
  inputFingerprint: string;
  state: AiCreditOperationState;
  debitIdempotencyKey: string;
  refundIdempotencyKey: string;
  draft: unknown | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export type AiCreditLock = {
  operationId: string;
  leaseExpiresAt: Date;
};

type OperationMutation = {
  operation?: AiCreditOperation;
  lock?: AiCreditLock | null;
};

export type AiCreditOperationRepository = {
  transact: <T>(
    operationId: string,
    userId: string,
    update: (
      operation: AiCreditOperation | null,
      lock: AiCreditLock | null,
    ) => { result: T; mutation?: OperationMutation },
  ) => Promise<T>;
};

export type AiCreditOperationTransactions = {
  debit: (userId: string, idempotencyKey: string) => Promise<void>;
  refund: (userId: string, idempotencyKey: string) => Promise<void>;
};

export type AiCreditOperationResult<TDraft> =
  { kind: "completed"; draft: TDraft } | { kind: "replay"; draft: TDraft };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getAiCreditOperationIdentity(
  userId: string,
  requestId: string,
): {
  operationId: string;
  debitIdempotencyKey: string;
  refundIdempotencyKey: string;
} {
  return {
    operationId: sha256(`operation:${userId}:${requestId}`),
    debitIdempotencyKey: sha256(`debit:${userId}:${requestId}`),
    refundIdempotencyKey: sha256(`refund:${userId}:${requestId}`),
  };
}

export function getAiCreditLockId(userId: string): string {
  return sha256(userId);
}

function storedDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  throw new Error("AI credit operation timestamp is invalid.");
}

function parseOperation(id: string, value: unknown): AiCreditOperation {
  const record = (value ?? {}) as Record<string, unknown>;
  const state = record.state;
  if (
    typeof record.userId !== "string" ||
    typeof record.requestId !== "string" ||
    typeof record.inputFingerprint !== "string" ||
    typeof record.debitIdempotencyKey !== "string" ||
    typeof record.refundIdempotencyKey !== "string" ||
    ![
      "debit_pending",
      "debited",
      "refund_pending",
      "refunded",
      "completed",
      "exhausted",
    ].includes(String(state))
  ) {
    throw new Error("AI credit operation is invalid.");
  }
  return {
    id,
    userId: record.userId,
    requestId: record.requestId,
    inputFingerprint: record.inputFingerprint,
    state: state as AiCreditOperationState,
    debitIdempotencyKey: record.debitIdempotencyKey,
    refundIdempotencyKey: record.refundIdempotencyKey,
    draft: record.draft ?? null,
    createdAt: storedDate(record.createdAt),
    updatedAt: storedDate(record.updatedAt),
    expiresAt: storedDate(record.expiresAt),
  };
}

function parseLock(value: unknown): AiCreditLock {
  const record = (value ?? {}) as Record<string, unknown>;
  if (typeof record.operationId !== "string") {
    throw new Error("AI credit lock is invalid.");
  }
  return {
    operationId: record.operationId,
    leaseExpiresAt: storedDate(record.leaseExpiresAt),
  };
}

export const firestoreAiCreditOperationRepository: AiCreditOperationRepository =
  {
    transact: async (operationId, userId, update) => {
      const db = getFirestore();
      const operationRef = db.doc(`aiCreditOperations/${operationId}`);
      const lockRef = db.doc(`aiCreditLocks/${getAiCreditLockId(userId)}`);
      return db.runTransaction(async (transaction) => {
        const [operationSnapshot, lockSnapshot] = await Promise.all([
          transaction.get(operationRef),
          transaction.get(lockRef),
        ]);
        const { result, mutation } = update(
          operationSnapshot.exists
            ? parseOperation(operationSnapshot.id, operationSnapshot.data())
            : null,
          lockSnapshot.exists ? parseLock(lockSnapshot.data()) : null,
        );
        if (mutation?.operation) {
          transaction.set(operationRef, mutation.operation);
        }
        if (mutation?.lock === null) transaction.delete(lockRef);
        else if (mutation?.lock) transaction.set(lockRef, mutation.lock);
        return result;
      });
    },
  };

type StartAction<TDraft> =
  | { kind: "debit"; operation: AiCreditOperation }
  | { kind: "refund"; operation: AiCreditOperation }
  | { kind: "replay"; draft: TDraft };

async function startOperation<TDraft>(
  repository: AiCreditOperationRepository,
  userId: string,
  requestId: string,
  inputFingerprint: string,
  now: Date,
): Promise<StartAction<TDraft>> {
  const identity = getAiCreditOperationIdentity(userId, requestId);
  return repository.transact(identity.operationId, userId, (existing, lock) => {
    if (existing) {
      if (
        existing.userId !== userId ||
        existing.inputFingerprint !== inputFingerprint
      ) {
        throw new HttpsError(
          "invalid-argument",
          "The AI planning request ID was reused for different goal details.",
        );
      }
      if (existing.state === "completed") {
        return { result: { kind: "replay", draft: existing.draft as TDraft } };
      }
      if (existing.state === "refunded" || existing.state === "exhausted") {
        throw new HttpsError(
          "failed-precondition",
          "This AI planning request is closed.",
        );
      }
    }
    if (lock && lock.leaseExpiresAt.getTime() > now.getTime()) {
      throw new HttpsError("aborted", "AI planning is already in progress.");
    }

    const operation: AiCreditOperation = existing
      ? {
          ...existing,
          state:
            existing.state === "debited" ? "refund_pending" : existing.state,
          updatedAt: now,
        }
      : {
          id: identity.operationId,
          userId,
          requestId,
          inputFingerprint,
          state: "debit_pending",
          debitIdempotencyKey: identity.debitIdempotencyKey,
          refundIdempotencyKey: identity.refundIdempotencyKey,
          draft: null,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + OPERATION_TTL_MS),
        };
    return {
      result: {
        kind: operation.state === "refund_pending" ? "refund" : "debit",
        operation,
      } as StartAction<TDraft>,
      mutation: {
        operation,
        lock: {
          operationId: identity.operationId,
          leaseExpiresAt: new Date(now.getTime() + LOCK_LEASE_MS),
        },
      },
    };
  });
}

async function setOperationState(
  repository: AiCreditOperationRepository,
  operation: AiCreditOperation,
  state: AiCreditOperationState,
  now: Date,
  draft: unknown | null = null,
  releaseLock = false,
): Promise<AiCreditOperation> {
  return repository.transact(operation.id, operation.userId, (current) => {
    if (!current || current.userId !== operation.userId) {
      throw new Error("AI credit operation was not found.");
    }
    const updated = { ...current, state, draft, updatedAt: now };
    return {
      result: updated,
      mutation: { operation: updated, ...(releaseLock ? { lock: null } : {}) },
    };
  });
}

function throwTransactionFailure(error: unknown): never {
  if (error instanceof RevenueCatVirtualCurrencyExhaustedError) {
    throw new HttpsError("resource-exhausted", error.message);
  }
  if (error instanceof RevenueCatV2RetryableError) {
    throw new HttpsError("unavailable", error.message);
  }
  throw error;
}

export async function runAiCreditOperation<TDraft>(
  userId: string,
  requestId: string,
  inputFingerprint: string,
  generate: () => Promise<TDraft>,
  transactions: AiCreditOperationTransactions,
  repository: AiCreditOperationRepository = firestoreAiCreditOperationRepository,
  now = new Date(),
): Promise<AiCreditOperationResult<TDraft>> {
  const start = await startOperation<TDraft>(
    repository,
    userId,
    requestId,
    inputFingerprint,
    now,
  );
  if (start.kind === "replay") return start;
  let operation = start.operation;

  if (start.kind === "refund") {
    try {
      await transactions.refund(userId, operation.refundIdempotencyKey);
      await setOperationState(
        repository,
        operation,
        "refunded",
        now,
        null,
        true,
      );
    } catch (error) {
      throwTransactionFailure(error);
    }
    throw new HttpsError(
      "internal",
      "The interrupted AI planning request was refunded.",
    );
  }

  try {
    await transactions.debit(userId, operation.debitIdempotencyKey);
  } catch (error) {
    if (error instanceof RevenueCatVirtualCurrencyExhaustedError) {
      await setOperationState(
        repository,
        operation,
        "exhausted",
        now,
        null,
        true,
      );
    }
    throwTransactionFailure(error);
  }
  operation = await setOperationState(repository, operation, "debited", now);

  let draft: TDraft;
  try {
    draft = await generate();
  } catch (generationError) {
    operation = await setOperationState(
      repository,
      operation,
      "refund_pending",
      now,
    );
    try {
      await transactions.refund(userId, operation.refundIdempotencyKey);
      await setOperationState(
        repository,
        operation,
        "refunded",
        now,
        null,
        true,
      );
    } catch (refundError) {
      throwTransactionFailure(refundError);
    }
    throw generationError;
  }

  await setOperationState(repository, operation, "completed", now, draft, true);
  return { kind: "completed", draft };
}
