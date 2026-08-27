export type RevenueCatProductGrant = {
  storeProductId: string;
  productType: string;
  currencyCode: string;
  amount: number;
  trialAmount: number | null;
  expiresAtCycleEnd: boolean;
};

export async function getRevenueCatProductGrantCatalog(): Promise<RevenueCatProductGrant[]> {
  const [{ httpsCallable }, { getFirebaseFunctions }] = await Promise.all([
    import('firebase/functions'),
    import('./firebaseFunctions'),
  ]);
  const getCatalog = httpsCallable<Record<string, never>, { products: RevenueCatProductGrant[] }>(
    getFirebaseFunctions(),
    'getRevenueCatProductGrantCatalog',
    { timeout: 20_000 },
  );
  const result = await getCatalog({});
  return result.data.products;
}
