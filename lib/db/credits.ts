import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const USERS_COL = "users";
const TRANSACTIONS_COL = "creditTransactions";

// ─── Types (local, not relying on global index.d.ts) ─────────────────────

interface AddCreditsParams {
  userId: string;
  creditsToAdd: number;
  stripeSessionId: string;
  packageName: string;
}

// ─── Exports ─────────────────────────────────────────────────────────────

export async function dbGetCredits(userId: string): Promise<number> {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) return 0;
  return (doc.data()?.credits as number) ?? 0;
}

export async function dbGrantInitialCredits(
  userId: string,
  amount: number,
): Promise<void> {
  const batch = db.batch();

  batch.update(db.collection(USERS_COL).doc(userId), { credits: amount });

  batch.set(db.collection(TRANSACTIONS_COL).doc(), {
    userId,
    type: "initial_grant",
    amount,
    description: `Welcome bonus — ${amount} free credits`,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
}

export async function dbDeductCredit(
  userId: string,
  description: string,
): Promise<number> {
  const userRef = db.collection(USERS_COL).doc(userId);

  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

    const current = (userDoc.data()?.credits as number) ?? 0;
    if (current < 1) throw new Error("INSUFFICIENT_CREDITS");

    const updated = current - 1;
    transaction.update(userRef, { credits: updated });

    transaction.set(db.collection(TRANSACTIONS_COL).doc(), {
      userId,
      type: "deduction",
      amount: -1,
      description,
      createdAt: new Date().toISOString(),
    });

    return updated;
  });
}

export async function dbAddCreditsAfterPurchase(
  params: AddCreditsParams,
): Promise<{ alreadyProcessed: boolean }> {
  const { userId, creditsToAdd, stripeSessionId, packageName } = params;

  const existing = await db
    .collection(TRANSACTIONS_COL)
    .where("stripeSessionId", "==", stripeSessionId)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.warn(
      `[db/credits] Session ${stripeSessionId} already processed. Skipping.`,
    );
    return { alreadyProcessed: true };
  }

  const batch = db.batch();

  batch.update(db.collection(USERS_COL).doc(userId), {
    credits: FieldValue.increment(creditsToAdd),
  });

  batch.set(db.collection(TRANSACTIONS_COL).doc(), {
    userId,
    type: "purchase",
    amount: creditsToAdd,
    description: `Purchased ${packageName} (${creditsToAdd} credits)`,
    stripeSessionId,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
  return { alreadyProcessed: false };
}

export async function dbGetCreditHistory(
  userId: string,
  limit = 20,
): Promise<CreditTransaction[]> {
  const snap = await db
    .collection(TRANSACTIONS_COL)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CreditTransaction[];
}
