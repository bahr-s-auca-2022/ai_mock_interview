"use client";

import { useState } from "react";
import { Zap, Star, Crown, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CREDIT_PACKAGES, formatPrice } from "@/lib/stripe";

const PACK_ICONS = [Zap, Star, Crown];

export function BillingPlans() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePurchase = async (priceId: string) => {
    if (loadingId) return; // Prevent double-click.
    setLoadingId(priceId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = (await res.json()) as {
        success: boolean;
        url?: string;
        error?: string;
      };

      if (!data.success || !data.url) {
        toast.error(
          data.error ?? "Failed to start checkout. Please try again.",
        );
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {CREDIT_PACKAGES.map((pack, i) => {
        const Icon = PACK_ICONS[i];
        const isLoading = loadingId === pack.id;
        const isDisabled = loadingId !== null && !isLoading;
        const pricePerCredit = (pack.priceUsd / pack.credits / 100).toFixed(2);

        return (
          <div
            key={pack.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition-all",
              pack.popular
                ? "border-accent-mustard bg-dark-200 shadow-[0_0_30px_-5px_rgba(212,165,93,0.2)]"
                : "border-white/10 bg-dark-300/40 hover:border-white/20",
            )}
          >
            {pack.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-mustard text-dark-100 text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}

            {/* Icon + name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "size-10 rounded-xl flex items-center justify-center",
                  pack.popular ? "bg-accent-mustard/20" : "bg-white/5",
                )}
              >
                <Icon
                  size={20}
                  className={
                    pack.popular ? "text-accent-mustard" : "text-light-400"
                  }
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-white font-semibold text-lg">{pack.name}</h3>
            </div>

            {/* Price */}
            <div className="mb-1">
              <span className="text-4xl font-bold text-white">
                {formatPrice(pack.priceUsd)}
              </span>
            </div>
            <p className="text-light-400 text-sm mb-6">
              ${pricePerCredit} per credit
            </p>

            {/* Features */}
            <ul
              className="space-y-2 mb-8 flex-1"
              aria-label={`${pack.name} features`}
            >
              <li className="flex items-center gap-2 text-light-100 text-sm">
                <CheckCircle
                  size={16}
                  className="text-accent-teal shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <strong className="text-white">
                    {pack.credits} interview credits
                  </strong>
                </span>
              </li>
              <li className="flex items-center gap-2 text-light-100 text-sm">
                <CheckCircle
                  size={16}
                  className="text-accent-teal shrink-0"
                  aria-hidden="true"
                />
                <span>1 credit = 1 voice session</span>
              </li>
              <li className="flex items-center gap-2 text-light-100 text-sm">
                <CheckCircle
                  size={16}
                  className="text-accent-teal shrink-0"
                  aria-hidden="true"
                />
                <span>AI-generated feedback included</span>
              </li>
              <li className="flex items-center gap-2 text-light-100 text-sm">
                <CheckCircle
                  size={16}
                  className="text-accent-teal shrink-0"
                  aria-hidden="true"
                />
                <span>Credits never expire</span>
              </li>
            </ul>

            {/* CTA */}
            <button
              onClick={() => handlePurchase(pack.id)}
              disabled={isDisabled || isLoading}
              aria-label={`Purchase ${pack.name} for ${formatPrice(pack.priceUsd)}`}
              aria-busy={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all",
                pack.popular
                  ? "bg-accent-mustard text-dark-100 hover:bg-accent-mustard/90"
                  : "bg-white/10 text-white hover:bg-white/20",
                (isDisabled || isLoading) && "opacity-50 cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  <span>Redirecting...</span>
                </>
              ) : (
                <span>Get {pack.credits} Credits</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
