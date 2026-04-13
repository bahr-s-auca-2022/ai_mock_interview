import { db } from "@/firebase/admin";

export async function getInterviewsByUserId(userId: string) {
  if (!userId) {
    console.log("No userId provided to getInterviewsByUserId");
    return [];
  }

  try {
    const interviewsRef = db.collection("interviews");
    const query = interviewsRef
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc");

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error in getInterviewsByUserId:", error);
    return [];
  }
}

export async function getLatestInterviews({ userId }: { userId: string }) {
  if (!userId) {
    console.log("No userId provided to getLatestInterviews");
    return [];
  }

  try {
    const interviewsRef = db.collection("interviews");
    const query = interviewsRef
      .where("finalized", "==", true)
      .where("userId", "!=", userId)
      .orderBy("createdAt", "desc")
      .limit(10);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error in getLatestInterviews:", error);
    return [];
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}
