import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const VALID_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Principal"] as const;
const VALID_TYPES = ["technical", "behavioural", "mixed"] as const;

type Level = (typeof VALID_LEVELS)[number];
type InterviewType = (typeof VALID_TYPES)[number];

const MAX_FIELD_LENGTH = 100;
const MAX_TECHSTACK_ITEMS = 10;
const MAX_TECHSTACK_ITEM_LEN = 50;
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;
const DEFAULT_QUESTIONS = 5;
const RATE_LIMIT_MAX = 10; // Increased for development
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

interface ExtractedParams {
  role: string;
  level: Level;
  type: InterviewType;
  techstack: string;
  amount: number;
}

function sanitizeText(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[`\\<>{}[\]]/g, "")
    .replace(/\s+/g, " ");
}

function sanitizeTechStack(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => sanitizeText(s, MAX_TECHSTACK_ITEM_LEN))
    .filter(Boolean)
    .slice(0, MAX_TECHSTACK_ITEMS);
}

function extractHintsViaRegex(transcript: string) {
  const lower = transcript.toLowerCase();

  // Role Detection
  const rolePatterns = [
    /\b(frontend|backend|fullstack|devops|data scientist|mobile|ios|android)\b/i,
    /(?:role|position|job)\s+(?:is|for|as|:|of)\s+([a-z][a-z\s]{2,40})/i,
  ];

  let possibleRole = "";
  for (const pattern of rolePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      possibleRole = (match[1] || match[0]).trim();
      break;
    }
  }

  const levelMatch = lower.match(/\b(junior|mid|senior|lead|principal)\b/);
  const possibleLevel = levelMatch ? levelMatch[0] : "";

  return { possibleRole, possibleLevel };
}

// ─── Transcript Parser ────────────────────────────────────────────────────────

async function parseTranscript(
  transcript: string,
): Promise<ExtractedParams | null> {
  const hints = extractHintsViaRegex(transcript);

  const prompt = `Extract interview details from this transcript. Return ONLY a single-line JSON object.
  Fields:
  - role: job title (default: "Software Engineer")
  - level: Junior, Mid, Senior, Lead, or Principal (default: "Mid")
  - type: technical, behavioural, or mixed (default: "mixed")
  - techstack: comma-separated list of technologies
  - amount: number of questions (1-20, default: 5)

  TRANSCRIPT: ${transcript.slice(0, 4000)}
  JSON:`;

  try {
    const { text } = await generateText({
      model: google("gemini-3-flash-preview"),
      prompt,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      role: sanitizeText(
        parsed.role || hints.possibleRole || "Software Engineer",
        MAX_FIELD_LENGTH,
      ),
      level: VALID_LEVELS.includes(parsed.level) ? parsed.level : "Mid",
      type: VALID_TYPES.includes(parsed.type) ? parsed.type : "mixed",
      techstack: parsed.techstack || "General",
      amount: Math.min(
        MAX_QUESTIONS,
        Math.max(MIN_QUESTIONS, parseInt(parsed.amount) || DEFAULT_QUESTIONS),
      ),
    };
  } catch (error) {
    console.error("[Parser Error]:", error);
    return null;
  }
}

async function generateQuestions(
  role: string,
  level: string,
  type: string,
  techstack: string[],
  amount: number,
) {
  const { text } = await generateText({
    model: google("gemini-3-flash-preview"),
    prompt: `Generat
    e ${amount} ${type} interview questions for a ${level} ${role} role. 
    Tech stack: ${techstack.join(", ")}. 
    Return as a JSON array of strings: ["Q1", "Q2"]`,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    const finalUserId = user?.id || body.userId || body.userid;

    if (!finalUserId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized. Please sign in or provide a userId.",
        },
        { status: 401 },
      );
    }

    // 3. Rate Limiting
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`gen:${finalUserId}`, {
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!allowed)
      return Response.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 },
      );

    let finalParams: ExtractedParams;
    const isTranscriptMode =
      body.transcript && (!body.role || body.role === "");

    if (isTranscriptMode) {
      const extracted = await parseTranscript(body.transcript);
      if (!extracted) throw new Error("Could not parse transcript");
      finalParams = extracted;
    } else {
      finalParams = {
        role: body.role,
        level: body.level,
        type: body.type,
        techstack: body.techstack,
        amount: parseInt(body.amount) || DEFAULT_QUESTIONS,
      };
    }

    const techArray = sanitizeTechStack(finalParams.techstack);
    const questions = await generateQuestions(
      finalParams.role,
      finalParams.level,
      finalParams.type,
      techArray,
      finalParams.amount,
    );

    if (questions.length === 0) throw new Error("No questions generated");

    const interviewDoc = {
      role: finalParams.role,
      level: finalParams.level,
      type: finalParams.type,
      techstack: techArray,
      questions,
      userId: finalUserId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interviewDoc);
    console.info(`[Generate] Success: ${docRef.id} for user ${finalUserId}`);

    return Response.json(
      {
        success: true,
        interviewId: docRef.id,
        questions,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Route Error]:", error);
    return Response.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({ success: true, message: "API is active" });
}
