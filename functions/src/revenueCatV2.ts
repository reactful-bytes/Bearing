export type RevenueCatV2Config = {
  apiKey: string;
  projectId: string;
  currencyCode: string;
};

export type RevenueCatVirtualCurrencyBalance = {
  code: string;
  balance: number;
};

export type RevenueCatVirtualCurrencyTransaction = "debit" | "refund" | "grant";

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

function parseBalance(payload: unknown, currencyCode: string): number | null {
  if (!payload || typeof payload !== "object") {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  const items = (payload as Record<string, unknown>).items;
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.currency_code !== "string" ||
        !item.currency_code.trim() ||
        typeof item.balance !== "number" ||
        !Number.isSafeInteger(item.balance) ||
        item.balance < 0,
    )
  ) {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  const matches = items.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as Record<string, unknown>).currency_code === currencyCode,
  );
  if (matches.length > 1) {
    throw new Error("RevenueCat virtual currency response is invalid.");
  }
  return matches.length ? requireNonNegativeInteger(matches[0].balance) : null;
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
  const initialUrl = new URL(virtualCurrencyUrl(config, userId));
  initialUrl.searchParams.set("include_empty_balances", "true");
  let url: URL | null = initialUrl;
  let balance: number | null = null;
  const visited = new Set<string>();
  while (url) {
    if (visited.has(url.href) || visited.size >= 100) {
      throw new Error("RevenueCat balance pagination is invalid.");
    }
    visited.add(url.href);
    const response = await requestRevenueCatV2(
      url.href,
      { headers: { Authorization: `Bearer ${config.apiKey}` } },
      fetcher,
    );
    if (response.status === 404 && visited.size === 1) {
      return { code: config.currencyCode, balance: 0 };
    }
    if (!response.ok) {
      throw new Error(
        `RevenueCat virtual currency balance failed: ${response.status}`,
      );
    }
    const payload: unknown = await response.json();
    const pageBalance = parseBalance(payload, config.currencyCode);
    if (pageBalance !== null) {
      if (balance !== null)
        throw new Error("RevenueCat virtual currency response is invalid.");
      balance = pageBalance;
    }
    const next = (payload as Record<string, unknown>).next_page;
    if (next === null || next === undefined) {
      url = null;
    } else {
      if (typeof next !== "string" || !next) {
        throw new Error("RevenueCat balance pagination is invalid.");
      }
      const nextUrl = new URL(next, initialUrl);
      if (
        nextUrl.origin !== initialUrl.origin ||
        nextUrl.pathname !== initialUrl.pathname ||
        nextUrl.username ||
        nextUrl.password ||
        nextUrl.hash
      ) {
        throw new Error("RevenueCat balance pagination is invalid.");
      }
      nextUrl.searchParams.set("include_empty_balances", "true");
      url = nextUrl;
    }
  }
  return { code: config.currencyCode, balance: balance ?? 0 };
}

export async function createRevenueCatVirtualCurrencyTransaction(
  userId: string,
  transaction: RevenueCatVirtualCurrencyTransaction,
  idempotencyKey: string,
  rawConfig: RevenueCatV2Config,
  fetcher: typeof fetch = fetch,
  amount = 1,
): Promise<void> {
  const config = requireConfig(rawConfig);
  if (!idempotencyKey.trim()) throw new Error("Idempotency key is required.");
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(
      "Virtual currency transaction amount must be a positive integer.",
    );
  }
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
          [config.currencyCode]: transaction === "debit" ? -amount : amount,
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

export async function ensureRevenueCatCustomer(
  userId: string,
  rawConfig: RevenueCatV2Config,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const config = requireConfig(rawConfig);
  const response = await requestRevenueCatV2(
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(config.projectId)}/customers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: userId }),
    },
    fetcher,
  );
  if (!response.ok && response.status !== 409) {
    throw new Error(`RevenueCat customer creation failed: ${response.status}`);
  }
}
