interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
}

// ─── User ─────────────────────────────────────────────────────────────────────

interface User {
  name: string;
  email: string;
  id: string;
  credits: number;
  createdAt: string;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

type CreditTransactionType = "initial_grant" | "purchase" | "deduction";

interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  description: string;
  stripeSessionId?: string;
  createdAt: string;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  popular?: boolean;
}

// ─── Timed Mode ───────────────────────────────────────────────────────────────

/** How many seconds the user gets per question in timed mode */
type TimeLimitSeconds = 60 | 90 | 120;

/** Recorded timing data for one question */
interface QuestionTiming {
  questionIndex: number;
  question: string;
  /** Seconds actually used (≤ timeLimitSeconds). */
  timeTaken: number;
  /** True if the timer ran out before the user finished. */
  timedOut: boolean;
}

// ─── Question Bank ────────────────────────────────────────────────────────────

interface SavedQuestion {
  id: string;
  userId: string;
  question: string;
  tags: string[];
  interviewRole: string;
  createdAt: string;
}

interface SaveQuestionParams {
  question: string;
  tags: string[];
  interviewRole: string;
}

// ─── Action Params ────────────────────────────────────────────────────────────

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
}

// ─── Component Props ──────────────────────────────────────────────────────────

type FormType = "sign-in" | "sign-up";

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "practice";
  questions?: string[];
  /** Enables the per-question countdown timer overlay. Only valid when type="practice" */
  timedMode?: boolean;
  /** Seconds per question. Defaults to 90. Only used when timedMode=true */
  timeLimitSeconds?: TimeLimitSeconds;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}
