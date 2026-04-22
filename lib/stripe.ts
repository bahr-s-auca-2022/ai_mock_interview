// lib/stripe.ts
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Stripe server-side singleton.
// Only used in API routes (server-side). Never imported into "use client" files.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Credit package catalogue.
//
// WHY NEXT_PUBLIC_ prefix on price IDs?
// BillingPlans.tsx is a "use client" component. In Next.js, any env var
// without the NEXT_PUBLIC_ prefix is undefined on the browser — only
// NEXT_PUBLIC_ vars are inlined at build time and sent to the client.
//
// Price IDs (price_...) are NOT secret — they are public Stripe identifiers
// the same way a product URL is public. The SECRET key (STRIPE_SECRET_KEY)
// must never have NEXT_PUBLIC_ and never leave the server.
//
// Both client (BillingPlans) and server (checkout route + webhook) read the
// same NEXT_PUBLIC_ vars, so the IDs always match when the server validates.
// ---------------------------------------------------------------------------

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

/**
 * Returns the CreditPackage matching a given Stripe Price ID.
 * Returns null for any ID not in the catalogue — this is the server-side
 * guard against spoofed checkout requests or tampered webhook payloads.
 */
export function getPackageByPriceId(priceId: string): CreditPackage | null {
  if (!priceId) return null;
  return CREDIT_PACKAGES.find((p) => p.id === priceId) ?? null;
}

/**
 * Converts Stripe's cent-based price to a display string. e.g. 799 → "$7.99"
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
