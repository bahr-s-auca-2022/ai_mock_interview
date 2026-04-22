import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const VALID_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Principal"] as const;
type Level = (typeof VALID_LEVELS)[number];

const VALID_TYPES = ["technical", "behavioural", "mixed"] as const;
type InterviewType = (typeof VALID_TYPES)[number];

const MAX_FIELD_LENGTH = 100;
const MAX_TECHSTACK_ITEMS = 10;
const MAX_TECHSTACK_ITEM_LENGTH = 50;
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function sanitizeText(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[`\\<>{}[\]]/g, "")
    .replace(/\s+/g, " "); // collapse whitespace
}

function sanitizeTechStack(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => sanitizeText(item, MAX_TECHSTACK_ITEM_LENGTH))
    .filter((item) => item.length > 0)
    .slice(0, MAX_TECHSTACK_ITEMS);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }
    const userId = user.id;
    const ip = getClientIp(request);
    const userRateKey = `generate:user:${userId}`;
    const ipRateKey = `generate:ip:${ip}`;

    const userLimit = rateLimit(userRateKey, {
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    const ipLimit = rateLimit(ipRateKey, {
      limit: RATE_LIMIT_MAX * 3,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!userLimit.allowed || !ipLimit.allowed) {
      const resetIn = Math.ceil(
        (Math.min(userLimit.resetAt, ipLimit.resetAt) - Date.now()) / 1000,
      );
      return Response.json(
        {
          success: false,
          error: `Too many requests. Please wait ${resetIn} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetIn),
            "X-RateLimit-Remaining": String(
              Math.min(userLimit.remaining, ipLimit.remaining),
            ),
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null) {
      return Response.json(
        { success: false, error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const { type, role, level, techstack, amount } = body as Record<
      string,
      unknown
    >;

    if (!type || !role || !level || !techstack || !amount) {
      return Response.json(
        {
          success: false,
          error:
            "Missing required fields: type, role, level, techstack, amount.",
        },
        { status: 400 },
      );
    }

    if (
      typeof type !== "string" ||
      typeof role !== "string" ||
      typeof level !== "string" ||
      typeof techstack !== "string"
    ) {
      return Response.json(
        {
          success: false,
          error: "type, role, level, and techstack must be strings.",
        },
        { status: 400 },
      );
    }

    const normalizedType = type.toLowerCase() as InterviewType;
    if (!VALID_TYPES.includes(normalizedType)) {
      return Response.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    if (!VALID_LEVELS.includes(level as Level)) {
      return Response.json(
        {
          success: false,
          error: `Invalid level. Must be one of: ${VALID_LEVELS.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const parsedAmount = parseInt(String(amount), 10);
    if (
      isNaN(parsedAmount) ||
      parsedAmount < MIN_QUESTIONS ||
      parsedAmount > MAX_QUESTIONS
    ) {
      return Response.json(
        {
          success: false,
          error: `amount must be a number between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`,
        },
        { status: 400 },
      );
    }

    const sanitizedRole = sanitizeText(role, MAX_FIELD_LENGTH);
    const sanitizedTechStack = sanitizeTechStack(techstack);

    if (sanitizedRole.length === 0) {
      return Response.json(
        { success: false, error: "role cannot be empty after sanitization." },
        { status: 400 },
      );
    }

    if (sanitizedTechStack.length === 0) {
      return Response.json(
        { success: false, error: "techstack must contain at least one item." },
        { status: 400 },
      );
    }

    let questionsText: string;
    try {
      const result = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: `Prepare questions for a job interview.
The job role is ${sanitizedRole}.
The job experience level is ${level}.
The tech stack used in the job is: ${sanitizedTechStack.join(", ")}.
The focus between behavioural and technical questions should lean towards: ${normalizedType}.
The amount of questions required is: ${parsedAmount}.
Please return only the questions, without any additional text.
The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
Return the questions formatted like this:
["Question 1", "Question 2", "Question 3"]`,
      });
      questionsText = result.text;
    } catch (aiError) {
      console.error("[generate/route] AI generation error:", aiError);
      return Response.json(
        {
          success: false,
          error: "Failed to generate questions. Please try again.",
        },
        { status: 500 },
      );
    }

    let questions: string[];
    try {
      const cleaned = questionsText.trim().replace(/```json\s*|\s*```/g, "");
      const parsed: unknown = JSON.parse(cleaned);

      if (
        !Array.isArray(parsed) ||
        !parsed.every((q) => typeof q === "string")
      ) {
        throw new Error("Response is not a string array.");
      }

      questions = parsed as string[];

      if (questions.length > parsedAmount) {
        questions = questions.slice(0, parsedAmount);
      }
    } catch (parseError) {
      console.error(
        "[generate/route] Failed to parse AI response:",
        parseError,
      );
      return Response.json(
        { success: false, error: "Failed to parse generated questions." },
        { status: 500 },
      );
    }

    const interview = {
      role: sanitizedRole,
      type: normalizedType,
      level,
      techstack: sanitizedTechStack,
      questions,
      userId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await db.collection("interviews").add(interview);
      return Response.json(
        { success: true, interviewId: docRef.id, questions },
        { status: 200 },
      );
    } catch (dbError) {
      console.error("[generate/route] Firestore write error:", dbError);
      return Response.json(
        {
          success: false,
          error: "Failed to save interview. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[generate/route] Unexpected error:", error);
    return Response.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json(
    {
      success: true,
      message: "VAPI Generate API is running.",
      endpoint: "POST /api/vapi/generate",
    },
    { status: 200 },
  );
}
