// RevenueCat service
// UI and interface are fully built. Purchases are stubbed until development build.
//
// To activate real purchases:
//   1. Apple Developer account + App Store Connect products created
//   2. RevenueCat account + products configured at app.revenuecat.com
//   3. npm install react-native-purchases
//   4. Add EXPO_PUBLIC_REVENUECAT_KEY_IOS to .env
//   5. Uncomment the SDK calls marked TODO below

export type PackageId =
  | 'vividcoach_premium_annual'
  | 'vividcoach_premium_monthly';

export interface SubscriptionPackage {
  id: PackageId;
  period: 'annual' | 'monthly';
  priceString: string;
  description: string;
}

export type PurchaseResult =
  | { success: true }
  | { success: false; cancelled: boolean; error?: string };

// These reflect real App Store pricing — update if prices change
export const PACKAGES: SubscriptionPackage[] = [
  {
    id: 'vividcoach_premium_annual',
    period: 'annual',
    priceString: '$99.00',
    description: '$8.25/mo',
  },
  {
    id: 'vividcoach_premium_monthly',
    period: 'monthly',
    priceString: '$12.99',
    description: 'billed monthly',
  },
];

export const revenueCatService = {
  async configure(): Promise<void> {
    // TODO: const Purchases = (await import('react-native-purchases')).default;
    // TODO: Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY_IOS! });
    console.log('[RevenueCat] Stubbed — activate with development build');
  },

  async purchasePackage(_packageId: PackageId): Promise<PurchaseResult> {
    // TODO: const offerings = await Purchases.getOfferings();
    // TODO: const pkg = offerings.current?.availablePackages.find(p => p.identifier === _packageId);
    // TODO: if (!pkg) return { success: false, cancelled: false, error: 'Package not found' };
    // TODO: await Purchases.purchasePackage(pkg);
    // TODO: return { success: true };
    return {
      success: false,
      cancelled: false,
      error: 'Purchases require a development build. See src/services/revenuecat.ts to activate.',
    };
  },

  async restorePurchases(): Promise<PurchaseResult> {
    // TODO: const info = await Purchases.restorePurchases();
    // TODO: const active = Object.keys(info.entitlements.active).length > 0;
    // TODO: return active ? { success: true } : { success: false, cancelled: false };
    return { success: false, cancelled: false, error: 'Requires development build' };
  },

  async getSubscriptionStatus(): Promise<'free' | 'premium'> {
    // TODO: const info = await Purchases.getCustomerInfo();
    // TODO: return info.entitlements.active['premium'] ? 'premium' : 'free';
    return 'free';
  },
};
