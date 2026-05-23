"use server";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";

const COLLECTION = "questionBank";
const MAX_QUESTIONS_PER_USER = 200;
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;
const MAX_QUESTION_LENGTH = 500;
const MAX_ROLE_LENGTH = 100;

export async function saveQuestion(
  params: SaveQuestionParams,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };

  const { question, tags, interviewRole } = params;

  const cleanQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!cleanQuestion)
    return { success: false, error: "Question cannot be empty." };

  const cleanRole = interviewRole.trim().slice(0, MAX_ROLE_LENGTH);

  const cleanTags = tags
    .slice(0, MAX_TAGS)
    .map((t) => t.trim().toLowerCase().slice(0, MAX_TAG_LENGTH))
    .filter((t) => t.length > 0);

  const existing = await db
    .collection(COLLECTION)
    .where("userId", "==", user.id)
    .where("question", "==", cleanQuestion)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { success: false, error: "This question is already in your bank." };
  }

  const countSnap = await db
    .collection(COLLECTION)
    .where("userId", "==", user.id)
    .count()
    .get();

  if (countSnap.data().count >= MAX_QUESTIONS_PER_USER) {
    return {
      success: false,
      error: `Question bank limit reached (${MAX_QUESTIONS_PER_USER} questions).`,
    };
  }

  const docRef = await db.collection(COLLECTION).add({
    userId: user.id,
    question: cleanQuestion,
    tags: cleanTags,
    interviewRole: cleanRole,
    createdAt: new Date().toISOString(),
  });

  return { success: true, id: docRef.id };
}

export async function isQuestionSaved(
  questionText: string,
): Promise<{ saved: boolean; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { saved: false };

  const snap = await db
    .collection(COLLECTION)
    .where("userId", "==", user.id)
    .where("question", "==", questionText.trim().slice(0, MAX_QUESTION_LENGTH))
    .limit(1)
    .get();

  if (snap.empty) return { saved: false };
  return { saved: true, id: snap.docs[0].id };
}

export async function getUserQuestions(
  filterTag?: string,
): Promise<SavedQuestion[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  let query = db
    .collection(COLLECTION)
    .where("userId", "==", user.id)
    .orderBy("createdAt", "desc")
    .limit(200);

  if (filterTag && filterTag.trim()) {
    query = db
      .collection(COLLECTION)
      .where("userId", "==", user.id)
      .where("tags", "array-contains", filterTag.trim().toLowerCase())
      .orderBy("createdAt", "desc")
      .limit(200);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SavedQuestion[];
}

export async function getUserTags(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const snap = await db
    .collection(COLLECTION)
    .where("userId", "==", user.id)
    .get();

  const tagSet = new Set<string>();
  snap.docs.forEach((doc) => {
    const tags = doc.data().tags as string[];
    tags?.forEach((t) => tagSet.add(t));
  });

  return Array.from(tagSet).sort();
}

export async function deleteQuestion(
  questionId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };

  const docRef = db.collection(COLLECTION).doc(questionId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { success: false, error: "Question not found." };
  }

  if (doc.data()?.userId !== user.id) {
    return {
      success: false,
      error: "You do not have permission to delete this question.",
    };
  }

  await docRef.delete();
  return { success: true };
}
