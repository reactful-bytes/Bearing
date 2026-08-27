export type RevenueCatV2Config = {
  apiKey: string;
  projectId: string;
  currencyCode: string;
};

export type RevenueCatVirtualCurrencyBalance = {
  code: string;
  balance: number;
};

export type RevenueCatVirtualCurrencyTransaction = "debit" | "refund";

export class RevenueCatVirtualCurrencyExhaustedError extends Error {
  constructor() {
    super("No AI planning credits remain.");
    this.name = "RevenueCatVirtualCurrencyExhaustedError";
  }
}

export class RevenueCatV2RetryableError extends Error {
  readonly status: number | null;

  constructor(status: number | null, options?: ErrorOptions) {
    super("RevenueCat virtual currency is temporarily unavailable.", options);
    this.name = "RevenueCatV2RetryableError";
    this.status = status;
  }
}

function requireConfig(config: RevenueCatV2Config): RevenueCatV2Config {
  const currencyCode = config.currencyCode.trim().toUpperCase();
  if (!config.apiKey.trim() || !config.projectId.trim() || !currencyCode) {
    throw new Error("RevenueCat V2 configuration is incomplete.");
  }
  return { ...config, currencyCode };
}

function requireNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  return value;
}

function parseBalance(payload: unknown, currencyCode: string): number {
  if (!payload || typeof payload !== "object") {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  const items = (payload as Record<string, unknown>).items;
  if (!Array.isArray(items)) {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  const matches = items.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as Record<string, unknown>).currency_code === currencyCode,
  );
  if (matches.length !== 1) {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  return requireNonNegativeInteger(matches[0].balance);
}

function virtualCurrencyUrl(
  config: RevenueCatV2Config,
  userId: string,
): string {
  return `https://api.revenuecat.com/v2/projects/${encodeURIComponent(config.projectId)}/customers/${encodeURIComponent(userId)}/virtual_currencies`;
}

async function requestRevenueCatV2(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<Response> {
  try {
    const response = await fetcher(url, init);
    if (
      response.status === 423 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      throw new RevenueCatV2RetryableError(response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof RevenueCatV2RetryableError) throw error;
    throw new RevenueCatV2RetryableError(null, { cause: error });
  }
}

export async function getRevenueCatVirtualCurrencyBalance(
  userId: string,
  rawConfig: RevenueCatV2Config,
  fetcher: typeof fetch = fetch,
): Promise<RevenueCatVirtualCurrencyBalance> {
  const config = requireConfig(rawConfig);
  const response = await requestRevenueCatV2(
    virtualCurrencyUrl(config, userId),
    { headers: { Authorization: `Bearer ${config.apiKey}` } },
    fetcher,
  );
  if (response.status === 404) {
    return { code: config.currencyCode, balance: 0 };
  }
  if (!response.ok) {
    throw new Error(
      `RevenueCat virtual currency balance failed: ${response.status}`,
    );
  }
  return {
    code: config.currencyCode,
    balance: parseBalance(await response.json(), config.currencyCode),
  };
}

export async function createRevenueCatVirtualCurrencyTransaction(
  userId: string,
  transaction: RevenueCatVirtualCurrencyTransaction,
  idempotencyKey: string,
  rawConfig: RevenueCatV2Config,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const config = requireConfig(rawConfig);
  if (!idempotencyKey.trim()) throw new Error("Idempotency key is required.");
  const response = await requestRevenueCatV2(
    `${virtualCurrencyUrl(config, userId)}/transactions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        adjustments: {
          [config.currencyCode]: transaction === "debit" ? -1 : 1,
        },
      }),
    },
    fetcher,
  );
  if (response.status === 422 && transaction === "debit") {
    throw new RevenueCatVirtualCurrencyExhaustedError();
  }
  if (!response.ok) {
    throw new Error(
      `RevenueCat virtual currency transaction failed: ${response.status}`,
    );
  }
}
