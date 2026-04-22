"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserCredits } from "@/lib/actions/billing.action";

interface UseCreditsReturn {
  credits: number | null; // null = still loading
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUserCredits();
      setCredits(result);
    } catch (err) {
      console.error("[useCredits] Failed to fetch credits:", err);
      setCredits(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, isLoading, refresh: fetchCredits };
}
