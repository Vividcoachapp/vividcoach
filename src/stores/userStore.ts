import { create } from 'zustand';

export type SubscriptionTier = 'free' | 'premium';

interface UserState {
  subscriptionTier: SubscriptionTier;
  isPremium: boolean;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
}

export const useUserStore = create<UserState>((set) => ({
  subscriptionTier: 'free',
  isPremium: false,
  setSubscriptionTier: (tier) =>
    set({ subscriptionTier: tier, isPremium: tier === 'premium' }),
}));
