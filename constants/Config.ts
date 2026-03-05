export const MAX_RECORDING_SECONDS = 60;

export const SUBSCRIPTION_TIERS = [
  {
    id: 'local',
    name: 'Local Race',
    price: 49,
    description: 'For city council, school board, county commissioner, and other local races.',
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_LOCAL ?? '',
  },
  {
    id: 'state',
    name: 'State Race',
    price: 99,
    description: 'For state legislature, state senate, governor, and other statewide races.',
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_STATE ?? '',
  },
  {
    id: 'national',
    name: 'National Race',
    price: 199,
    description: 'For U.S. House, U.S. Senate, and presidential races.',
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_NATIONAL ?? '',
  },
] as const;

export type SubscriptionTierId = (typeof SUBSCRIPTION_TIERS)[number]['id'];
