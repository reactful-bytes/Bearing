import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";
import { RevenueCatV2Config, RevenueCatV2RetryableError } from "./revenueCatV2";

const FRESH_CACHE_MS = 5 * 60 * 1000;
const STALE_CACHE_MS = 15 * 60 * 1000;

export type RevenueCatProductGrant = {
  storeProductId: string;
  productType: string;
  currencyCode: string;
  amount: number;
  trialAmount: number | null;
  expiresAtCycleEnd: boolean;
};

type CatalogCache = {
  value: RevenueCatProductGrant[];
  loadedAt: number;
};

function requireItems(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    throw new Error("RevenueCat catalog response is invalid.");
  }
  const items = (payload as Record<string, unknown>).items;
  if (
    !Array.isArray(items) ||
    items.some((item) => !item || typeof item !== "object")
  ) {
    throw new Error("RevenueCat catalog response is invalid.");
  }
  return items as Array<Record<string, unknown>>;
}

function nextPage(payload: unknown): string | null {
  const value = (payload as Record<string, unknown>).next_page;
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error("RevenueCat catalog pagination is invalid.");
  }
  if (value.startsWith("/v2/")) return `https://api.revenuecat.com${value}`;
  if (value.startsWith("https://api.revenuecat.com/v2/")) return value;
  throw new Error("RevenueCat catalog pagination is invalid.");
}

async function fetchPage(
  url: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (error) {
    throw new RevenueCatV2RetryableError(null, { cause: error });
  }
  if (
    response.status === 423 ||
    response.status === 429 ||
    response.status >= 500
  ) {
    throw new RevenueCatV2RetryableError(response.status);
  }
  if (!response.ok)
    throw new Error(`RevenueCat catalog request failed: ${response.status}`);
  return response.json();
}

async function fetchAllPages(
  initialUrl: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = [];
  let url: string | null = initialUrl;
  const visited = new Set<string>();
  while (url) {
    if (visited.has(url))
      throw new Error("RevenueCat catalog pagination is invalid.");
    visited.add(url);
    const payload = await fetchPage(url, apiKey, fetcher);
    items.push(...requireItems(payload));
    url = nextPage(payload);
  }
  return items;
}

export function createRevenueCatProductGrantCatalog(
  config: RevenueCatV2Config,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): () => Promise<RevenueCatProductGrant[]> {
  let cache: CatalogCache | null = null;
  return async () => {
    const currentTime = now();
    if (cache && currentTime - cache.loadedAt <= FRESH_CACHE_MS)
      return cache.value;
    try {
      const baseUrl = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(config.projectId)}`;
      const [products, currencyPayload] = await Promise.all([
        fetchAllPages(`${baseUrl}/products?limit=100`, config.apiKey, fetcher),
        fetchPage(
          `${baseUrl}/virtual_currencies/${encodeURIComponent(config.currencyCode.toUpperCase())}`,
          config.apiKey,
          fetcher,
        ),
      ]);
      if (!currencyPayload || typeof currencyPayload !== "object") {
        throw new Error("RevenueCat virtual currency response is invalid.");
      }
      const grants = (currencyPayload as Record<string, unknown>)
        .product_grants;
      if (
        !Array.isArray(grants) ||
        grants.some((grant) => !grant || typeof grant !== "object")
      ) {
        throw new Error("RevenueCat product grant response is invalid.");
      }
      const storeProducts = new Map<
        string,
        { storeProductId: string; productType: string }
      >();
      for (const product of products) {
        if (
          typeof product.id !== "string" ||
          typeof product.store_identifier !== "string" ||
          typeof product.type !== "string"
        ) {
          throw new Error("RevenueCat product response is invalid.");
        }
        storeProducts.set(product.id, {
          storeProductId: product.store_identifier,
          productType: product.type,
        });
      }
      const value = (grants as Array<Record<string, unknown>>)
        .flatMap((grant) => {
          if (
            !Array.isArray(grant.product_ids) ||
            grant.product_ids.length === 0 ||
            grant.product_ids.some(
              (productId) => typeof productId !== "string",
            ) ||
            typeof grant.amount !== "number" ||
            !Number.isSafeInteger(grant.amount) ||
            grant.amount <= 0 ||
            (grant.trial_amount !== null &&
              grant.trial_amount !== undefined &&
              (typeof grant.trial_amount !== "number" ||
                !Number.isSafeInteger(grant.trial_amount) ||
                grant.trial_amount < 0)) ||
            (grant.expire_at_cycle_end !== null &&
              grant.expire_at_cycle_end !== undefined &&
              typeof grant.expire_at_cycle_end !== "boolean")
          ) {
            throw new Error("RevenueCat product grant response is invalid.");
          }
          return (grant.product_ids as string[]).map((productId) => {
            const product = storeProducts.get(productId);
            if (!product)
              throw new Error("RevenueCat product grant join is invalid.");
            return {
              ...product,
              currencyCode: config.currencyCode.toUpperCase(),
              amount: grant.amount as number,
              trialAmount:
                typeof grant.trial_amount === "number"
                  ? grant.trial_amount
                  : null,
              expiresAtCycleEnd: grant.expire_at_cycle_end === true,
            };
          });
        })
        .sort((left, right) =>
          left.storeProductId.localeCompare(right.storeProductId),
        );
      cache = { value, loadedAt: currentTime };
      return value;
    } catch (error) {
      if (cache && currentTime - cache.loadedAt <= STALE_CACHE_MS)
        return cache.value;
      throw error;
    }
  };
}

export async function getRevenueCatProductGrantCatalog(
  request: CallableIdentityRequest,
  loadCatalog: () => Promise<RevenueCatProductGrant[]>,
): Promise<{ products: RevenueCatProductGrant[] }> {
  requireAuthenticatedCaller(request);
  return { products: await loadCatalog() };
}
