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

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
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
