import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "[stripe] STRIPE_SECRET_KEY is not set. Add it to your .env.local file.",
    );
  }

  _stripe = new Stripe(key, {
    apiVersion: "2025-03-31.basil",
    typescript: true,
  });

  return _stripe;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "",
    name: "Starter Pack",
    credits: 5,
    priceUsd: 299,
  },
  {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    name: "Pro Pack",
    credits: 15,
    priceUsd: 799,
    popular: true,
  },
  {
    id: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? "",
    name: "Premium Pack",
    credits: 40,
    priceUsd: 1799,
  },
];

export function getPackageByPriceId(priceId: string): CreditPackage | null {
  if (!priceId) return null;
  return CREDIT_PACKAGES.find((p) => p.id === priceId) ?? null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
