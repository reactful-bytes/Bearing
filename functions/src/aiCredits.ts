import { Timestamp, getFirestore } from "firebase-admin/firestore";

export const AI_CREDITS_PER_BILLING_MONTH = 10;
export const AI_RESERVATION_LEASE_MS = 2 * 60 * 1000;
export const AI_PLAN_TTL_MS = 24 * 60 * 60 * 1000;

export type AiCreditSubscriptionStatus =
  "active" | "in_grace_period" | "expired" | "canceled";

export type AiCreditSubscription = {
  status: AiCreditSubscriptionStatus | null;
  periodStartAt: Date | null;
  periodEndAt: Date | null;
};

export type AiCreditAccount = {
  userId: string;
  availableCredits: number;
  reservedCredits: number;
  totalGranted: number;
  totalConsumed: number;
  accrualStartedAt: Date;
  lastGrantedBillingAt: Date;
  activeReservationId: string | null;
  reservationExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiCreditGrant = {
  userId: string;
  amount: number;
  billingAt: Date;
  createdAt: Date;
};

export type AiPlanReservationState = "reserved" | "completed" | "refunded";

export type AiPlanReservation<TDraft = unknown> = {
  userId: string;
  requestId: string;
  inputFingerprint: string;
  state: AiPlanReservationState;
  reservedAt: Date;
  leaseExpiresAt: Date;
  completedAt: Date | null;
  draft: TDraft | null;
  expiresAt: Date;
};

export type AiCreditStatus = {
  eligible: boolean;
  availableCredits: number;
  nextGrantAt: string | null;
};

export type AiCreditTransaction = {
  getAccount: () => Promise<AiCreditAccount | null>;
  hasGrant: (grantId: string) => Promise<boolean>;
  setAccount: (account: AiCreditAccount) => void;
  setGrant: (grantId: string, grant: AiCreditGrant) => void;
};

export type AiCreditTransactionRunner = <T>(
  userId: string,
  operation: (transaction: AiCreditTransaction) => Promise<T>,
) => Promise<T>;

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function assertValidAccount(account: AiCreditAccount): void {
  if (
    !account.userId ||
    !isNonNegativeInteger(account.availableCredits) ||
    !isNonNegativeInteger(account.reservedCredits) ||
    !isNonNegativeInteger(account.totalGranted) ||
    !isNonNegativeInteger(account.totalConsumed) ||
    account.availableCredits +
      account.reservedCredits +
      account.totalConsumed !==
      account.totalGranted ||
    !isValidDate(account.accrualStartedAt) ||
    !isValidDate(account.lastGrantedBillingAt) ||
    !isValidDate(account.createdAt) ||
    !isValidDate(account.updatedAt)
  ) {
    throw new Error("AI credit account is invalid.");
  }
}

function dateFromStoredValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

function numberFromStoredValue(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function accountFromStoredValue(value: unknown): AiCreditAccount {
  const record = (value ?? {}) as Record<string, unknown>;
  const account: AiCreditAccount = {
    userId: typeof record.userId === "string" ? record.userId : "",
    availableCredits: numberFromStoredValue(record.availableCredits),
    reservedCredits: numberFromStoredValue(record.reservedCredits),
    totalGranted: numberFromStoredValue(record.totalGranted),
    totalConsumed: numberFromStoredValue(record.totalConsumed),
    accrualStartedAt:
      dateFromStoredValue(record.accrualStartedAt) ?? new Date(NaN),
    lastGrantedBillingAt:
      dateFromStoredValue(record.lastGrantedBillingAt) ?? new Date(NaN),
    activeReservationId:
      typeof record.activeReservationId === "string"
        ? record.activeReservationId
        : null,
    reservationExpiresAt: dateFromStoredValue(record.reservationExpiresAt),
    createdAt: dateFromStoredValue(record.createdAt) ?? new Date(NaN),
    updatedAt: dateFromStoredValue(record.updatedAt) ?? new Date(NaN),
  };
  assertValidAccount(account);
  return account;
}

export const runFirestoreAiCreditTransaction: AiCreditTransactionRunner =
  async (userId, operation) => {
    const db = getFirestore();
    const accountRef = db.doc(`aiCreditAccounts/${userId}`);

    return db.runTransaction(async (firestoreTransaction) =>
      operation({
        getAccount: async () => {
          const snapshot = await firestoreTransaction.get(accountRef);
          return snapshot.exists
            ? accountFromStoredValue(snapshot.data())
            : null;
        },
        hasGrant: async (grantId) =>
          (await firestoreTransaction.get(db.doc(`aiCreditGrants/${grantId}`)))
            .exists,
        setAccount: (account) => firestoreTransaction.set(accountRef, account),
        setGrant: (grantId, grant) =>
          firestoreTransaction.set(db.doc(`aiCreditGrants/${grantId}`), grant),
      }),
    );
  };

function bootstrapGrantId(userId: string): string {
  return `${encodeURIComponent(userId)}:bootstrap`;
}

function billingGrantId(userId: string, billingAt: Date): string {
  return `${encodeURIComponent(userId)}:${billingAt.getTime()}`;
}

export async function reconcileAiCredits(
  userId: string,
  subscription: AiCreditSubscription,
  now = new Date(),
  runTransaction: AiCreditTransactionRunner = runFirestoreAiCreditTransaction,
): Promise<AiCreditAccount | null> {
  return runTransaction(userId, async (transaction) => {
    const existing = await transaction.getAccount();
    if (existing) {
      assertValidAccount(existing);
      if (existing.userId !== userId) {
        throw new Error("AI credit account owner is invalid.");
      }
    }

    if (subscription.status !== "active") return existing;

    if (!existing) {
      const lastGrantedBillingAt = getLatestBillingAnniversary(
        subscription.periodStartAt,
        subscription.periodEndAt,
        now,
      );
      const account: AiCreditAccount = {
        userId,
        availableCredits: AI_CREDITS_PER_BILLING_MONTH,
        reservedCredits: 0,
        totalGranted: AI_CREDITS_PER_BILLING_MONTH,
        totalConsumed: 0,
        accrualStartedAt: now,
        lastGrantedBillingAt,
        activeReservationId: null,
        reservationExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      transaction.setAccount(account);
      transaction.setGrant(bootstrapGrantId(userId), {
        userId,
        amount: AI_CREDITS_PER_BILLING_MONTH,
        billingAt: lastGrantedBillingAt,
        createdAt: now,
      });
      return account;
    }

    const due = getDueBillingAnniversaries(
      subscription.periodStartAt,
      subscription.periodEndAt,
      existing.lastGrantedBillingAt,
      now,
    );
    const missing = (
      await Promise.all(
        due.map(async (billingAt) => ({
          billingAt,
          exists: await transaction.hasGrant(billingGrantId(userId, billingAt)),
        })),
      )
    ).filter(({ exists }) => !exists);

    if (due.length === 0) return existing;

    const granted = missing.length * AI_CREDITS_PER_BILLING_MONTH;
    const account: AiCreditAccount = {
      ...existing,
      availableCredits: existing.availableCredits + granted,
      totalGranted: existing.totalGranted + granted,
      lastGrantedBillingAt: due.at(-1)!,
      updatedAt: now,
    };
    assertValidAccount(account);
    transaction.setAccount(account);
    for (const { billingAt } of missing) {
      transaction.setGrant(billingGrantId(userId, billingAt), {
        userId,
        amount: AI_CREDITS_PER_BILLING_MONTH,
        billingAt,
        createdAt: now,
      });
    }
    return account;
  });
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function getBillingAnniversary(
  periodStartAt: Date,
  monthOffset: number,
): Date | null {
  if (
    !isValidDate(periodStartAt) ||
    !Number.isInteger(monthOffset) ||
    monthOffset < 0
  ) {
    return null;
  }

  const targetMonth = periodStartAt.getUTCMonth() + monthOffset;
  const targetYear =
    periodStartAt.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const targetDay = Math.min(
    periodStartAt.getUTCDate(),
    daysInUtcMonth(targetYear, normalizedMonth),
  );

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      targetDay,
      periodStartAt.getUTCHours(),
      periodStartAt.getUTCMinutes(),
      periodStartAt.getUTCSeconds(),
      periodStartAt.getUTCMilliseconds(),
    ),
  );
}

export function getDueBillingAnniversaries(
  periodStartAt: Date | null,
  periodEndAt: Date | null,
  lastGrantedBillingAt: Date,
  now: Date,
): Date[] {
  if (
    !periodStartAt ||
    !periodEndAt ||
    !isValidDate(periodStartAt) ||
    !isValidDate(periodEndAt) ||
    !isValidDate(lastGrantedBillingAt) ||
    !isValidDate(now) ||
    periodEndAt.getTime() <= periodStartAt.getTime()
  ) {
    return [];
  }

  const through = Math.min(now.getTime(), periodEndAt.getTime() - 1);
  const due: Date[] = [];

  for (let monthOffset = 0; monthOffset < 1_200; monthOffset += 1) {
    const anniversary = getBillingAnniversary(periodStartAt, monthOffset);
    if (!anniversary || anniversary.getTime() > through) break;
    if (anniversary.getTime() > lastGrantedBillingAt.getTime()) {
      due.push(anniversary);
    }
  }

  return due;
}

export function getLatestBillingAnniversary(
  periodStartAt: Date | null,
  periodEndAt: Date | null,
  now: Date,
): Date {
  if (
    !periodStartAt ||
    !periodEndAt ||
    !isValidDate(periodStartAt) ||
    !isValidDate(periodEndAt) ||
    periodStartAt.getTime() > now.getTime()
  ) {
    return now;
  }

  const due = getDueBillingAnniversaries(
    periodStartAt,
    periodEndAt,
    new Date(0),
    now,
  );
  return due.at(-1) ?? now;
}

export function getNextBillingAnniversary(
  periodStartAt: Date | null,
  periodEndAt: Date | null,
  lastGrantedBillingAt: Date,
): Date | null {
  if (!periodStartAt || !periodEndAt) return null;

  for (let monthOffset = 0; monthOffset < 1_200; monthOffset += 1) {
    const anniversary = getBillingAnniversary(periodStartAt, monthOffset);
    if (!anniversary || anniversary.getTime() >= periodEndAt.getTime()) {
      return null;
    }
    if (anniversary.getTime() > lastGrantedBillingAt.getTime()) {
      return anniversary;
    }
  }

  return null;
}
