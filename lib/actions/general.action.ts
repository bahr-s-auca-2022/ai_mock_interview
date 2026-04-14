"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    console.log("=== CREATE FEEDBACK STARTED ===");
    console.log("Params received:", {
      interviewId,
      userId,
      transcriptLength: transcript.length,
      feedbackId,
    });

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`,
      )
      .join("");

    console.log("Formatted transcript length:", formattedTranscript.length);

    // Try with a different model name
    const { object } = await generateObject({
      model: google("gemini-3-flash-preview", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
  You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. 
  
  Transcript:
  ${formattedTranscript}

  You MUST return a JSON object with exactly this structure:
  {
    "totalScore": number between 0-100,
    "categoryScores": [
      {
        "name": "Communication Skills",
        "score": number between 0-100,
        "comment": "detailed feedback"
      },
      {
        "name": "Technical Knowledge",
        "score": number between 0-100,
        "comment": "detailed feedback"
      },
      {
        "name": "Problem Solving",
        "score": number between 0-100,
        "comment": "detailed feedback"
      },
      {
        "name": "Cultural Fit",
        "score": number between 0-100,
        "comment": "detailed feedback"
      },
      {
        "name": "Confidence and Clarity",
        "score": number between 0-100,
        "comment": "detailed feedback"
      }
    ],
    "strengths": ["strength1", "strength2", "strength3"],
    "areasForImprovement": ["area1", "area2", "area3"],
    "finalAssessment": "overall assessment summary"
  }

  Be thorough and detailed in your analysis. Don't be lenient. Point out mistakes and areas for improvement.
`,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    console.log("Gemini generated feedback successfully");
    console.log("Total score:", object.totalScore);

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    console.log("Saving feedback to Firebase...");

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    console.log("Feedback saved successfully with ID:", feedbackRef.id);

    return {
      success: true,
      feedbackId: feedbackRef.id,
    };
  } catch (error) {
    console.error("Error saving feedback:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  try {
    const interview = await db.collection("interviews").doc(id).get();

    if (!interview.exists) {
      return null;
    }

    return {
      id: interview.id,
      ...interview.data(),
    } as Interview;
  } catch (error) {
    console.error("Error getting interview:", error);
    return null;
  }
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams,
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  try {
    console.log("Fetching feedback for:", { interviewId, userId });

    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    console.log("Query result:", {
      empty: querySnapshot.empty,
      size: querySnapshot.size,
      docs: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });

    if (querySnapshot.empty) {
      console.log("No feedback found for this interview");
      return null;
    }

    const feedbackDoc = querySnapshot.docs[0];
    const feedbackData = {
      id: feedbackDoc.id,
      ...feedbackDoc.data(),
    } as Feedback;

    console.log("Feedback found:", feedbackData);
    return feedbackData;
  } catch (error) {
    console.error("Error getting feedback:", error);
    return null;
  }
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams,
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  try {
    const interviews = await db
      .collection("interviews")
      .orderBy("createdAt", "desc")
      .where("finalized", "==", true)
      .where("userId", "!=", userId)
      .limit(limit)
      .get();

    return interviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (error) {
    console.error("Error getting latest interviews:", error);
    return null;
  }
}

export async function getInterviewsByUserId(
  userId: string,
): Promise<Interview[] | null> {
  try {
    const interviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return interviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (error) {
    console.error("Error getting user interviews:", error);
    return null;
  }
}
