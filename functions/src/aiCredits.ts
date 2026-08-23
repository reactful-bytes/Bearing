import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";

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
  getPlan: (requestId: string) => Promise<AiPlanReservation | null>;
  setAccount: (account: AiCreditAccount) => void;
  setGrant: (grantId: string, grant: AiCreditGrant) => void;
  setPlan: (requestId: string, plan: AiPlanReservation) => void;
};

export type AiCreditTransactionRunner = <T>(
  userId: string,
  operation: (transaction: AiCreditTransaction) => Promise<T>,
) => Promise<T>;

function logCreditOperation(
  operation: "grant" | "reserve" | "finalize" | "refund",
  outcome: string,
  credits: number,
): void {
  logger.info("ai_credit_operation", { operation, outcome, credits });
}

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

function planFromStoredValue(value: unknown): AiPlanReservation {
  const record = (value ?? {}) as Record<string, unknown>;
  const state = record.state;
  if (
    typeof record.userId !== "string" ||
    typeof record.requestId !== "string" ||
    typeof record.inputFingerprint !== "string" ||
    (state !== "reserved" && state !== "completed" && state !== "refunded")
  ) {
    throw new Error("AI plan reservation is invalid.");
  }

  const plan: AiPlanReservation = {
    userId: record.userId,
    requestId: record.requestId,
    inputFingerprint: record.inputFingerprint,
    state,
    reservedAt: dateFromStoredValue(record.reservedAt) ?? new Date(NaN),
    leaseExpiresAt: dateFromStoredValue(record.leaseExpiresAt) ?? new Date(NaN),
    completedAt: dateFromStoredValue(record.completedAt),
    draft: record.draft ?? null,
    expiresAt: dateFromStoredValue(record.expiresAt) ?? new Date(NaN),
  };
  if (
    !isValidDate(plan.reservedAt) ||
    !isValidDate(plan.leaseExpiresAt) ||
    !isValidDate(plan.expiresAt)
  ) {
    throw new Error("AI plan reservation is invalid.");
  }
  return plan;
}

export const runFirestoreAiCreditTransaction: AiCreditTransactionRunner =
  async (userId, operation) => {
    const db = getFirestore();
    const accountRef = db.doc(`aiCreditAccounts/${userId}`);
    const planRef = (requestId: string) =>
      db.doc(`aiPlans/${encodeURIComponent(userId)}:${requestId}`);

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
        getPlan: async (requestId) => {
          const snapshot = await firestoreTransaction.get(planRef(requestId));
          return snapshot.exists ? planFromStoredValue(snapshot.data()) : null;
        },
        setAccount: (account) => firestoreTransaction.set(accountRef, account),
        setGrant: (grantId, grant) =>
          firestoreTransaction.set(db.doc(`aiCreditGrants/${grantId}`), grant),
        setPlan: (requestId, plan) =>
          firestoreTransaction.set(planRef(requestId), plan),
      }),
    );
  };

export type AiCreditReservationResult =
  | { kind: "reserved"; availableCredits: number }
  | { kind: "replay"; availableCredits: number; draft: unknown };

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
      logCreditOperation("grant", "bootstrap", AI_CREDITS_PER_BILLING_MONTH);
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
    if (granted > 0) logCreditOperation("grant", "anniversary", granted);
    return account;
  });
}

function refundedPlan(plan: AiPlanReservation, now: Date): AiPlanReservation {
  return {
    ...plan,
    state: "refunded",
    completedAt: now,
    draft: null,
  };
}

export async function reserveAiCredit(
  userId: string,
  requestId: string,
  inputFingerprint: string,
  now = new Date(),
  runTransaction: AiCreditTransactionRunner = runFirestoreAiCreditTransaction,
): Promise<AiCreditReservationResult> {
  return runTransaction(userId, async (transaction) => {
    let account = await transaction.getAccount();
    if (!account || account.userId !== userId) {
      logCreditOperation("reserve", "exhausted", 0);
      throw new HttpsError(
        "resource-exhausted",
        "No AI planning credits remain.",
      );
    }
    assertValidAccount(account);

    const existingPlan = await transaction.getPlan(requestId);
    if (existingPlan) {
      if (
        existingPlan.userId !== userId ||
        existingPlan.inputFingerprint !== inputFingerprint
      ) {
        throw new HttpsError(
          "invalid-argument",
          "The AI planning request ID was reused for different goal details.",
        );
      }
      if (existingPlan.state === "completed") {
        logCreditOperation("reserve", "replay", 0);
        return {
          kind: "replay",
          availableCredits: account.availableCredits,
          draft: existingPlan.draft,
        };
      }
      if (
        existingPlan.state === "reserved" &&
        existingPlan.leaseExpiresAt.getTime() > now.getTime()
      ) {
        logCreditOperation("reserve", "concurrent", 0);
        throw new HttpsError(
          "aborted",
          "AI planning is already in progress for this request.",
        );
      }
    }

    if (account.activeReservationId) {
      const activePlan = await transaction.getPlan(account.activeReservationId);
      if (
        activePlan?.state === "reserved" &&
        activePlan.leaseExpiresAt.getTime() > now.getTime()
      ) {
        logCreditOperation("reserve", "concurrent", 0);
        throw new HttpsError(
          "aborted",
          "Another AI plan is already being generated.",
        );
      }
      if (activePlan?.state === "reserved") {
        transaction.setPlan(
          activePlan.requestId,
          refundedPlan(activePlan, now),
        );
        logCreditOperation("refund", "expired_lease", 1);
      }
      account = {
        ...account,
        availableCredits: account.availableCredits + account.reservedCredits,
        reservedCredits: 0,
        activeReservationId: null,
        reservationExpiresAt: null,
        updatedAt: now,
      };
    }

    if (account.availableCredits < 1) {
      logCreditOperation("reserve", "exhausted", 0);
      throw new HttpsError(
        "resource-exhausted",
        "No AI planning credits remain.",
      );
    }

    const leaseExpiresAt = new Date(now.getTime() + AI_RESERVATION_LEASE_MS);
    const plan: AiPlanReservation = {
      userId,
      requestId,
      inputFingerprint,
      state: "reserved",
      reservedAt: now,
      leaseExpiresAt,
      completedAt: null,
      draft: null,
      expiresAt: new Date(now.getTime() + AI_PLAN_TTL_MS),
    };
    account = {
      ...account,
      availableCredits: account.availableCredits - 1,
      reservedCredits: 1,
      activeReservationId: requestId,
      reservationExpiresAt: leaseExpiresAt,
      updatedAt: now,
    };
    assertValidAccount(account);
    transaction.setAccount(account);
    transaction.setPlan(requestId, plan);
    logCreditOperation("reserve", "success", 1);
    return { kind: "reserved", availableCredits: account.availableCredits };
  });
}

export async function finalizeAiCredit(
  userId: string,
  requestId: string,
  draft: unknown,
  now = new Date(),
  runTransaction: AiCreditTransactionRunner = runFirestoreAiCreditTransaction,
): Promise<number> {
  return runTransaction(userId, async (transaction) => {
    const account = await transaction.getAccount();
    const plan = await transaction.getPlan(requestId);
    if (!account || !plan || plan.userId !== userId) {
      throw new Error("AI credit reservation was not found.");
    }
    if (plan.state === "completed") return account.availableCredits;
    if (
      plan.state !== "reserved" ||
      account.activeReservationId !== requestId ||
      account.reservedCredits !== 1
    ) {
      throw new Error("AI credit reservation is not active.");
    }

    const updated: AiCreditAccount = {
      ...account,
      reservedCredits: 0,
      totalConsumed: account.totalConsumed + 1,
      activeReservationId: null,
      reservationExpiresAt: null,
      updatedAt: now,
    };
    assertValidAccount(updated);
    transaction.setAccount(updated);
    transaction.setPlan(requestId, {
      ...plan,
      state: "completed",
      completedAt: now,
      draft,
    });
    logCreditOperation("finalize", "success", 1);
    return updated.availableCredits;
  });
}

export async function refundAiCredit(
  userId: string,
  requestId: string,
  now = new Date(),
  runTransaction: AiCreditTransactionRunner = runFirestoreAiCreditTransaction,
): Promise<void> {
  await runTransaction(userId, async (transaction) => {
    const account = await transaction.getAccount();
    const plan = await transaction.getPlan(requestId);
    if (
      !account ||
      !plan ||
      plan.state !== "reserved" ||
      account.activeReservationId !== requestId
    ) {
      return;
    }

    const updated: AiCreditAccount = {
      ...account,
      availableCredits: account.availableCredits + account.reservedCredits,
      reservedCredits: 0,
      activeReservationId: null,
      reservationExpiresAt: null,
      updatedAt: now,
    };
    assertValidAccount(updated);
    transaction.setAccount(updated);
    transaction.setPlan(requestId, refundedPlan(plan, now));
    logCreditOperation("refund", "failure", 1);
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
