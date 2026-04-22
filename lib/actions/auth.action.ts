"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";
import { grantInitialCredits } from "@/lib/actions/billing.action";

const ONE_WEEK = 60 * 60 * 24 * 7;
const USER_COLLECTION = "users";

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    const userDoc = await db.collection(USER_COLLECTION).doc(uid).get();

    if (userDoc.exists) {
      return {
        success: false,
        message: "User already exists. Please sign in instead.",
      };
    }

    // Create the user document. credits starts at 0 — grantInitialCredits
    // below sets it to the correct value atomically and logs the transaction.
    await db.collection(USER_COLLECTION).doc(uid).set({
      name,
      email,
      credits: 0,
      createdAt: new Date().toISOString(),
    });

    // Grant the welcome-bonus credits and write the transaction log.
    await grantInitialCredits(uid);

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (e: unknown) {
    console.error("Error creating a user", e);
    const code = (e as { code?: string })?.code;
    return {
      success: false,
      message:
        code === "auth/email-already-exists"
          ? "Email already exists."
          : "Failed to create account.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;
  try {
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return { success: false, message: "User does not exist." };
    }

    const userDoc = await db
      .collection(USER_COLLECTION)
      .doc(userRecord.uid)
      .get();

    if (!userDoc.exists) {
      await db
        .collection(USER_COLLECTION)
        .doc(userRecord.uid)
        .set({
          name: userRecord.displayName || email.split("@")[0],
          email,
          credits: 0,
          createdAt: new Date().toISOString(),
        });

      // Grant initial credits to social-login users on their first sign-in.
      await grantInitialCredits(userRecord.uid);
    }

    await setSessionCookie(idToken);
    return { success: true };
  } catch (e) {
    console.error("Sign in error:", e);
    return { success: false, message: "Failed to log in." };
  }
}

export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK * 1000,
  });

  cookieStore.set("session", sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRecord = await db
      .collection(USER_COLLECTION)
      .doc(decodedClaims.uid)
      .get();

    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    console.error("[auth] Invalid session:", error);
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function logout() {
  (await cookies()).delete("session");
  return { success: true };
}
