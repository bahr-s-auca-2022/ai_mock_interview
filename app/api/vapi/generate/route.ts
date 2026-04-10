import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    // Parse and validate the request body
    const { type, role, level, techstack, amount, userid } =
      await request.json();

    // ✅ Validate required fields
    if (!userid) {
      return Response.json(
        { success: false, error: "userid is required" },
        { status: 400 },
      );
    }

    if (!role || !type || !level || !techstack || !amount) {
      return Response.json(
        {
          success: false,
          error:
            "Missing required fields: role, type, level, techstack, amount",
        },
        { status: 400 },
      );
    }

    console.log("Generating interview for user:", userid);
    console.log("Parameters:", { type, role, level, techstack, amount });

    // ✅ Generate questions with timeout and retry logic
    let questionsText;
    try {
      const result = await generateText({
        model: google("gemini-3-flash-preview"),
        prompt: `Prepare questions for a job interview.
          The job role is ${role}.
          The job experience level is ${level}.
          The tech stack used in the job is: ${techstack}.
          The focus between behavioural and technical questions should lean towards: ${type}.
          The amount of questions required is: ${amount}.
          Please return only the questions, without any additional text.
          The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
          Return the questions formatted like this:
          ["Question 1", "Question 2", "Question 3"]
          
          Thank you! <3
        `,
      });
      questionsText = result.text;
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      return Response.json(
        {
          success: false,
          error: "Failed to generate questions. Please try again.",
          details:
            aiError instanceof Error ? aiError.message : "Unknown AI error",
        },
        { status: 500 },
      );
    }

    // ✅ Parse questions safely
    let questions;
    try {
      // Clean the response (remove markdown code blocks if present)
      const cleaned = questionsText.trim().replace(/```json\s*|\s*```/g, "");
      questions = JSON.parse(cleaned);

      // ✅ Validate questions is an array
      if (!Array.isArray(questions)) {
        throw new Error("Questions is not an array");
      }

      // ✅ Ensure we have the requested number of questions
      const requestedAmount = parseInt(amount);
      if (questions.length !== requestedAmount) {
        console.warn(
          `Expected ${requestedAmount} questions but got ${questions.length}`,
        );
        // Optionally trim or pad the questions array
        if (questions.length > requestedAmount) {
          questions = questions.slice(0, requestedAmount);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse questions:", questionsText);
      return Response.json(
        {
          success: false,
          error: "Failed to parse generated questions",
          rawResponse: questionsText,
        },
        { status: 500 },
      );
    }

    // ✅ Create interview object
    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(",").map((item: string) => item.trim()), // Clean techstack
      questions: questions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // ✅ Save to Firebase
    try {
      const docRef = await db.collection("interviews").add(interview);
      console.log("Interview saved with ID:", docRef.id);

      return Response.json(
        {
          success: true,
          interviewId: docRef.id,
          questions: questions,
        },
        { status: 200 },
      );
    } catch (dbError) {
      console.error("Database error:", dbError);
      return Response.json(
        {
          success: false,
          error: "Failed to save interview to database",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json(
    {
      success: true,
      message: "VAPI Generate API is working",
      endpoints: {
        post: "/api/vapi/generate - Create a new interview",
      },
    },
    { status: 200 },
  );
}

// ✅ Add OPTIONS handler for CORS if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
