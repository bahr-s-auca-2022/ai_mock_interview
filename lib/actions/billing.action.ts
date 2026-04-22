"use server";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  dbGetCredits,
  dbGrantInitialCredits,
  dbDeductCredit,
  dbAddCreditsAfterPurchase,
  dbGetCreditHistory,
} from "@/lib/db/credits";

const INITIAL_CREDITS = 3;

// ─── Read ─────────────────────────────────────────────────────────────────

export async function getUserCredits(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return dbGetCredits(user.id);
}

export async function getCreditHistory(): Promise<CreditTransaction[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return dbGetCreditHistory(user.id);
}

// ─── Write ────────────────────────────────────────────────────────────────

export async function grantInitialCredits(userId: string): Promise<void> {
  await dbGrantInitialCredits(userId, INITIAL_CREDITS);
}

export async function deductCredit(
  interviewType: "generate" | "practice",
): Promise<{ success: boolean; error?: string; remainingCredits?: number }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const description =
    interviewType === "generate"
      ? "Interview generation session"
      : "Practice interview session";

  try {
    const remainingCredits = await dbDeductCredit(user.id, description);
    return { success: true, remainingCredits };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "INSUFFICIENT_CREDITS") {
      return {
        success: false,
        error:
          "You don't have enough credits. Please top up your balance to continue.",
      };
    }

    console.error("[billing] deductCredit failed:", err);
    return {
      success: false,
      error: "A billing error occurred. Please try again.",
    };
  }
}
