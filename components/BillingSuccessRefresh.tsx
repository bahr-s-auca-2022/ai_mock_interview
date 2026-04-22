"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

interface BillingSuccessRefreshProps {
  isSuccess: boolean;
}

export function BillingSuccessRefresh({
  isSuccess,
}: BillingSuccessRefreshProps) {
  const router = useRouter();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (!isSuccess || hasRefreshed.current) return;

    const timer = setTimeout(() => {
      hasRefreshed.current = true;
      router.refresh();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isSuccess, router]);

  if (!isSuccess) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400"
    >
      <CheckCircle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">Payment successful!</p>
        <p className="text-sm opacity-80">
          Your credits are being added to your account.
        </p>
      </div>
      <Loader2
        size={16}
        className="animate-spin opacity-50 shrink-0 mt-0.5"
        aria-label="Updating balance..."
      />
    </div>
  );
}
