"use client";

import Link from "next/link";
import { Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";

interface CreditBalanceProps {
  className?: string;
}

export function CreditBalance({ className }: CreditBalanceProps) {
  const { credits, isLoading } = useCredits();

  const isLow = credits !== null && credits <= 1;

  return (
    <Link
      href="/billing"
      aria-label={
        isLoading
          ? "Loading credit balance"
          : `You have ${credits ?? 0} interview credits. Click to top up.`
      }
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all",
        isLow
          ? "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border-accent-mustard/30 bg-accent-mustard/10 text-accent-mustard hover:bg-accent-mustard/20",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Zap size={14} aria-hidden="true" />
      )}

      {isLoading ? (
        <span>Loading...</span>
      ) : (
        <span>
          {credits ?? 0}{" "}
          <span className="font-normal opacity-70">
            {credits === 1 ? "credit" : "credits"}
          </span>
        </span>
      )}

      {isLow && !isLoading && (
        <span
          className="size-1.5 rounded-full bg-red-400 animate-pulse"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
