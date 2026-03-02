"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7;
const USER_COLLECTION = "users"; // Standardized name

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

    await db.collection(USER_COLLECTION).doc(uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (e: any) {
    console.error("Error creating a user", e);
    return {
      success: false,
      message:
        e.code === "auth/email-already-exists"
          ? "Email already exists"
          : "Failed to create account",
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

    // --- CRITICAL ADDITION FOR SOCIAL LOGIN ---
    // Ensure Firestore document exists (important if they signed in via Google)
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
          email: email,
          createdAt: new Date().toISOString(),
        });
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
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) return null;

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userDoc = await db
      .collection(USER_COLLECTION)
      .doc(decodedClaims.uid)
      .get();

    if (!userDoc.exists) return null;

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as User;
  } catch (e) {
    console.error("Get current user error:", e);
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
