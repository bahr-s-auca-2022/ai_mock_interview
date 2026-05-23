"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  PhoneOff,
  Loader2,
  Zap,
  AlertTriangle,
  Timer,
  Sparkles,
  ChevronRight,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
import { deductCredit } from "@/lib/actions/billing.action";
import { useCredits } from "@/hooks/useCredits";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface VapiTranscriptMessage {
  type: "transcript";
  transcriptType: "partial" | "final";
  role: "user" | "assistant" | "system";
  transcript: string;
}

interface VapiEndOfCallReport {
  type: "end-of-call-report";
  transcript?: string;
  summary?: string;
  artifact?: {
    transcript?: string;
    messages?: Array<{ role: string; message: string; time?: number }>;
  };
  call?: Record<string, unknown>;
}

type VapiMessage = VapiTranscriptMessage | VapiEndOfCallReport;

interface QuestionTiming {
  questionIndex: number;
  question: string;
  timeTaken: number;
  timedOut: boolean;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "practice";
  questions?: string[];
  timedMode?: boolean;
  timeLimitSeconds?: number;
}

function SpeakingWave({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-end justify-center gap-[3px] h-5"
      aria-hidden="true"
    >
      {[0.6, 1, 0.75, 1, 0.6].map((scale, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-300 bg-accent-mustard",
            active ? "opacity-80" : "opacity-20",
          )}
          style={{
            height: active ? `${scale * 20}px` : "4px",
            transitionDelay: active ? `${i * 60}ms` : "0ms",
            animation: active
              ? `wave ${0.8 + i * 0.1}s ease-in-out infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

function TimerBar({
  timeRemaining,
  total,
}: {
  timeRemaining: number;
  total: number;
}) {
  const pct = (timeRemaining / total) * 100;
  const isLow = pct < 25;
  return (
    <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-1000 ease-linear",
          isLow ? "bg-destructive-100" : "bg-accent-teal",
        )}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={timeRemaining}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${timeRemaining} seconds remaining`}
      />
    </div>
  );
}

function TimedQuestionCard({
  question,
  index,
  total,
  timeRemaining,
  timeLimitSeconds,
  onSkip,
}: {
  question: string;
  index: number;
  total: number;
  timeRemaining: number;
  timeLimitSeconds: number;
  onSkip: () => void;
}) {
  const isLow = timeRemaining < timeLimitSeconds * 0.25;
  return (
    <div className="w-full rounded-2xl border border-white/8 bg-dark-200 p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-light-400/70">
        <div className="flex items-center gap-1.5">
          <Timer size={11} aria-hidden="true" />
          <span>
            Question {index + 1} of {total}
          </span>
        </div>
        <span
          className={cn(
            "font-mono font-semibold tabular-nums transition-colors",
            isLow ? "text-destructive-100" : "text-light-400/70",
          )}
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${timeRemaining} seconds remaining`}
        >
          {timeRemaining}s
        </span>
      </div>

      <TimerBar timeRemaining={timeRemaining} total={timeLimitSeconds} />

      <p className="text-sm font-medium text-light-100 leading-relaxed">
        {question}
      </p>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 text-xs text-light-400/60 hover:text-light-400 transition-colors"
        aria-label="Skip to next question"
      >
        <SkipForward size={11} aria-hidden="true" />
        Skip question
      </button>
    </div>
  );
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions = [],
  timedMode = false,
  timeLimitSeconds = 90,
}: AgentProps) => {
  const router = useRouter();
  const {
    credits,
    isLoading: creditsLoading,
    refresh: refreshCredits,
  } = useCredits();

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState("");

  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
  const timingsRef = useRef<QuestionTiming[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  const endOfCallTranscriptRef = useRef<string>("");
  const reportReceivedRef = useRef<boolean>(false);

  const hasGeneratedFeedback = useRef(false);
  const hasGeneratedInterview = useRef(false);
  const isNavigating = useRef(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasNoCredits = !creditsLoading && credits !== null && credits < 1;
  const isPostCallLoading = isGeneratingFeedback || isGeneratingInterview;
  const isTimedAndActive =
    timedMode && type === "practice" && callStatus === CallStatus.ACTIVE;

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advanceQuestion = useCallback(
    (timedOut: boolean) => {
      stopTimer();
      const timeTaken = Math.round(
        (Date.now() - questionStartTimeRef.current) / 1000,
      );
      timingsRef.current.push({
        questionIndex: currentQuestionIndex,
        question: questions[currentQuestionIndex] ?? "",
        timeTaken: Math.min(timeTaken, timeLimitSeconds),
        timedOut,
      });

      if (currentQuestionIndex >= questions.length - 1) {
        toast.info("All questions completed.");
        vapi.stop();
        return;
      }

      const next = currentQuestionIndex + 1;
      setCurrentQuestionIndex(next);
      setTimeRemaining(timeLimitSeconds);
      questionStartTimeRef.current = Date.now();
    },
    [currentQuestionIndex, questions, timeLimitSeconds, stopTimer],
  );

  const startTimer = useCallback(() => {
    stopTimer();
    questionStartTimeRef.current = Date.now();
    setTimeRemaining(timeLimitSeconds);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          advanceQuestion(true);
          return timeLimitSeconds;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLimitSeconds, stopTimer, advanceQuestion]);

  // ── Interview generation (generate mode) ──────────────────────────────────

  const handleGenerateInterview = useCallback(
    async (msgs: SavedMessage[]) => {
      if (hasGeneratedInterview.current) return;
      hasGeneratedInterview.current = true;
      setIsGeneratingInterview(true);

      // Tier 1: VAPI end-of-call-report transcript
      let transcriptText = endOfCallTranscriptRef.current.trim();

      // Tier 2: accumulated incremental messages
      if (!transcriptText) {
        transcriptText = msgs
          .filter((m) => m.role !== "system")
          .map(
            (m) =>
              `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`,
          )
          .join("\n")
          .trim();
      }

      if (!transcriptText) {
        toast.warning("No conversation was recorded. Please try again.");
        setIsGeneratingInterview(false);
        if (!isNavigating.current) {
          isNavigating.current = true;
          router.push("/");
        }
        return;
      }

      try {
        const res = await fetch("/api/vapi/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: transcriptText,
            role: "", // signals transcript-parsing mode in route.ts
            userId,
          }),
        });

        const data: { success: boolean; interviewId?: string; error?: string } =
          await res.json();

        if (data.success && data.interviewId) {
          toast.success("Interview created! Redirecting to dashboard…");
          router.refresh();
          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push("/");
          }
        } else {
          throw new Error(data.error ?? "Generation failed");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to create interview.";
        console.error("[Agent] Interview generation error:", err);
        toast.error(msg, {
          action: { label: "Retry", onClick: () => router.push("/interview") },
        });
        if (!isNavigating.current) {
          isNavigating.current = true;
          router.push("/");
        }
      } finally {
        setIsGeneratingInterview(false);
      }
    },
    [userId, router],
  );

  // Feedback generation (practice mode)

  const handleGenerateFeedback = useCallback(
    async (msgs: SavedMessage[]) => {
      if (hasGeneratedFeedback.current) return;
      hasGeneratedFeedback.current = true;
      setIsGeneratingFeedback(true);

      let finalMessages = [...msgs];

      if (timedMode && timingsRef.current.length > 0) {
        const summary = timingsRef.current
          .map(
            (t) =>
              `Q${t.questionIndex + 1}: "${t.question}" — ${t.timeTaken}s/${timeLimitSeconds}s${t.timedOut ? " (TIMED OUT)" : ""}`,
          )
          .join("\n");
        finalMessages = [
          ...msgs,
          {
            role: "system" as const,
            content: `[TIMED MODE SUMMARY]\n${summary}\nInclude time management feedback.`,
          },
        ];
      }

      try {
        const result = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: finalMessages,
          feedbackId,
        });

        if (result.success && result.feedbackId) {
          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push(`/interview/${interviewId}/feedback`);
          }
        } else {
          toast.error("Feedback generation failed.");
          router.push("/");
        }
      } catch (err) {
        console.error("[Agent] Feedback error:", err);
        router.push("/");
      } finally {
        setIsGeneratingFeedback(false);
      }
    },
    [interviewId, userId, feedbackId, router, timedMode, timeLimitSeconds],
  );

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      if (timedMode && type === "practice") startTimer();
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
      stopTimer();
    };

    const onMessage = (message: VapiMessage) => {
      if (message.type === "end-of-call-report") {
        const report = message as VapiEndOfCallReport;
        const full =
          report.transcript?.trim() ||
          report.artifact?.transcript?.trim() ||
          report.artifact?.messages
            ?.map(
              (m) =>
                `${m.role === "assistant" ? "Assistant" : "User"}: ${m.message}`,
            )
            .join("\n")
            .trim() ||
          "";
        if (full) {
          endOfCallTranscriptRef.current = full;
          reportReceivedRef.current = true;
        }
        return;
      }

      // ── Accumulate incremental transcript events (fallback) ───────────
      if (message.type === "transcript" && message.transcriptType === "final") {
        setMessages((prev) => [
          ...prev,
          { role: message.role, content: message.transcript },
        ]);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);

    vapi.on("message", onMessage as any);
    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));
    vapi.on("error", (err: Error) => console.error("[VAPI Error]:", err));

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);

      vapi.off("message", onMessage as any);
      stopTimer();
    };
  }, [timedMode, type, startTimer, stopTimer]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  // Reset transcript ref when a new call starts
  useEffect(() => {
    if (callStatus === CallStatus.CONNECTING) {
      endOfCallTranscriptRef.current = "";
      reportReceivedRef.current = false;
    }
  }, [callStatus]);

  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED || isNavigating.current) return;

    if (type === "generate") {
      const t = setTimeout(() => {
        if (!hasGeneratedInterview.current) {
          handleGenerateInterview(messages);
        }
      }, 150);
      return () => clearTimeout(t);
    }

    if (type === "practice" && interviewId) {
      if (messages.length > 0 && !hasGeneratedFeedback.current) {
        handleGenerateFeedback(messages);
      } else if (messages.length === 0) {
        toast.warning("No transcript recorded.");
        isNavigating.current = true;
        router.push("/");
      }
    }
  }, [
    callStatus,
    type,
    interviewId,
    messages,
    handleGenerateInterview,
    handleGenerateFeedback,
    router,
  ]);

  const handleCall = async () => {
    if (hasNoCredits) {
      toast.error("No credits remaining.", {
        action: { label: "Top Up", onClick: () => router.push("/billing") },
      });
      return;
    }

    setCallStatus(CallStatus.CONNECTING);
    hasGeneratedFeedback.current = false;
    hasGeneratedInterview.current = false;
    isNavigating.current = false;
    timingsRef.current = [];
    setMessages([]);
    setCurrentQuestionIndex(0);
    setTimeRemaining(timeLimitSeconds);

    const deduction = await deductCredit(type);
    if (!deduction.success) {
      toast.error(deduction.error ?? "Billing error. Please try again.");
      setCallStatus(CallStatus.INACTIVE);
      return;
    }
    await refreshCredits();

    try {
      if (type === "generate") {
        const wfId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
        if (!wfId) {
          toast.error("Configuration error. Please contact support.");
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
        await vapi.start(wfId, {
          variableValues: { username: userName, userid: userId },
        });
      } else {
        if (!questions.length) {
          toast.error("No questions available.");
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
        await vapi.start(interviewer, {
          variableValues: {
            questions: questions.map((q) => `- ${q}`).join("\n"),
          },
        });
      }
    } catch (err) {
      console.error("[Agent] VAPI start error:", err);
      toast.error("Failed to start session. Please try again.");
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    stopTimer();
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <style>{`
        @keyframes wave {
          0%   { transform: scaleY(0.5); }
          100% { transform: scaleY(1); }
        }
      `}</style>

      <div className="flex flex-col gap-6 max-w-4xl  mx-auto py-8 min-h-[80vh]">
        {hasNoCredits && callStatus === CallStatus.INACTIVE && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-destructive-100/8 border border-destructive-100/20 text-destructive-100"
          >
            <AlertTriangle
              size={16}
              className="shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">No credits remaining</p>
              <p className="text-xs opacity-80 mt-0.5">
                Top up to start a new session.
              </p>
            </div>
            <Link
              href="/billing"
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-mustard text-dark-100 hover:bg-accent-mustard/90 transition-colors"
            >
              <Zap size={11} aria-hidden="true" />
              Top Up
            </Link>
          </div>
        )}

        {/* ── Timed mode badge ───────────────────────────────────────────── */}
        {timedMode &&
          type === "practice" &&
          callStatus === CallStatus.INACTIVE && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-accent-teal/20 bg-accent-teal/6 text-accent-teal text-xs font-medium">
              <Timer size={13} aria-hidden="true" />
              <span>
                Timed mode — {timeLimitSeconds}s per question ·{" "}
                {questions.length} questions
              </span>
            </div>
          )}

        <div className="grid sm:grid-cols-2 gap-4">
          {/* AI card */}
          <div
            aria-label={
              isSpeaking ? "AI interviewer is speaking" : "AI interviewer"
            }
            role="status"
            className={cn(
              "relative flex flex-col items-center justify-center rounded-2xl border py-10 gap-5 overflow-hidden transition-all duration-500",
              isSpeaking
                ? "border-accent-mustard/25 bg-dark-200 shadow-[0_0_30px_-8px_rgba(212,165,93,0.15)]"
                : "border-white/6 bg-dark-200",
            )}
          >
            {isSpeaking && (
              <div
                className="absolute inset-0 rounded-2xl border border-accent-mustard/10 animate-ping"
                aria-hidden="true"
              />
            )}

            <div className="relative size-20">
              <div
                className={cn(
                  "size-full rounded-2xl bg-dark-300 border border-white/8 flex-center transition-transform duration-500",
                  isSpeaking && "scale-105",
                )}
              >
                <Image
                  src="/logo2.png"
                  alt=""
                  aria-hidden="true"
                  width={42}
                  height={36}
                  className="object-contain"
                />
              </div>

              {callStatus === CallStatus.ACTIVE && (
                <span
                  className="absolute -bottom-1 -right-1 size-3 rounded-full bg-success-100 border-2 border-dark-200"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-light-400/60 uppercase tracking-widest">
                AI Interviewer
              </p>
              <p className="text-sm font-semibold text-light-100">EchoMock</p>
            </div>

            <SpeakingWave active={isSpeaking} />
          </div>

          <div
            aria-label="Candidate"
            className="relative flex flex-col items-center justify-center rounded-2xl border border-white/6 bg-dark-200 py-10 gap-5"
          >
            <div className="relative size-20 rounded-2xl bg-dark-300 border border-white/8 flex-center">
              <span
                className="text-xl font-semibold text-light-100/60 select-none"
                aria-hidden="true"
              >
                {(userName ?? "U").charAt(0).toUpperCase()}
              </span>
              {callStatus === CallStatus.ACTIVE && (
                <span
                  className="absolute -bottom-1 -right-1 size-3 rounded-full bg-success-100 border-2 border-dark-200"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-light-400/60 uppercase tracking-widest">
                Candidate
              </p>
              <p className="text-sm font-semibold text-light-100 truncate max-w-[140px]">
                {userName || "You"}
              </p>
            </div>

            {/* Credit badge */}
            {!creditsLoading &&
              credits !== null &&
              callStatus === CallStatus.INACTIVE && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border",
                    credits < 1
                      ? "bg-destructive-100/8 border-destructive-100/20 text-destructive-100"
                      : "bg-white/4 border-white/8 text-light-400",
                  )}
                  aria-label={`${credits} credits remaining`}
                >
                  <Zap size={10} aria-hidden="true" />
                  {credits} credit{credits !== 1 ? "s" : ""}
                </div>
              )}
          </div>
        </div>

        {/* ── Timed question card ────────────────────────────────────────── */}
        {isTimedAndActive && questions.length > 0 && (
          <TimedQuestionCard
            question={questions[currentQuestionIndex] ?? ""}
            index={currentQuestionIndex}
            total={questions.length}
            timeRemaining={timeRemaining}
            timeLimitSeconds={timeLimitSeconds}
            onSkip={() => advanceQuestion(false)}
          />
        )}

        {!isTimedAndActive && (
          <div className="flex-1 flex items-center justify-center py-4 min-h-[80px]">
            {isPostCallLoading ? (
              <div
                role="status"
                aria-live="polite"
                aria-label={
                  isGeneratingInterview
                    ? "Building your interview"
                    : "Generating feedback"
                }
                className="flex flex-col items-center gap-3 text-center"
              >
                {isGeneratingInterview ? (
                  <Sparkles
                    size={24}
                    className="text-accent-mustard animate-pulse"
                    aria-hidden="true"
                  />
                ) : (
                  <Loader2
                    size={24}
                    className="text-accent-teal animate-spin"
                    aria-hidden="true"
                  />
                )}
                <p className="text-sm font-medium text-light-100">
                  {isGeneratingInterview
                    ? "Building your interview…"
                    : "Generating feedback…"}
                </p>
                <p className="text-xs text-light-400/60">
                  {isGeneratingInterview
                    ? "Parsing requirements and generating questions"
                    : "This takes around 15–20 seconds"}
                </p>
              </div>
            ) : messages.length > 0 ? (
              <div className="w-full max-w-lg">
                <div className="rounded-xl border border-white/6 bg-dark-200 px-5 py-4">
                  <p className="text-[11px] font-medium text-light-400/50 uppercase tracking-widest mb-2">
                    Live transcript
                  </p>
                  <p
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-sm text-light-100/90 leading-relaxed italic"
                  >
                    &ldquo;{lastMessage}&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-light-400/40 text-center"
              >
                {callStatus === CallStatus.INACTIVE
                  ? hasNoCredits
                    ? "Top up credits to start"
                    : type === "generate"
                      ? "Click below to create a new interview"
                      : "Click below to start your session"
                  : callStatus === CallStatus.CONNECTING
                    ? "Connecting…"
                    : "Waiting for conversation to begin"}
              </p>
            )}
          </div>
        )}

        {/* ── Call controls ──────────────────────────────────────────────── */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
          <div className="bg-dark-200/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)] rounded-2xl p-2 flex items-center gap-2">
            {callStatus !== CallStatus.ACTIVE ? (
              <button
                onClick={handleCall}
                disabled={
                  callStatus === CallStatus.CONNECTING ||
                  isPostCallLoading ||
                  hasNoCredits ||
                  creditsLoading
                }
                aria-busy={callStatus === CallStatus.CONNECTING}
                aria-label={
                  hasNoCredits
                    ? "No credits — visit billing"
                    : type === "generate"
                      ? "Create new interview"
                      : "Start interview"
                }
                className={cn(
                  "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150",
                  hasNoCredits
                    ? "bg-white/4 text-light-400/50 cursor-not-allowed"
                    : "bg-accent-mustard text-dark-100 hover:bg-accent-mustard/90 active:scale-[0.98]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {callStatus === CallStatus.CONNECTING ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    <span>Connecting…</span>
                  </>
                ) : hasNoCredits ? (
                  <>
                    <Zap size={16} aria-hidden="true" />
                    <span>No Credits</span>
                  </>
                ) : (
                  <>
                    {timedMode && type === "practice" ? (
                      <Timer size={16} aria-hidden="true" />
                    ) : (
                      <Mic size={16} aria-hidden="true" />
                    )}
                    <span>
                      {type === "generate"
                        ? "Create New Interview"
                        : timedMode
                          ? "Start Timed Session"
                          : "Start Interview"}
                    </span>
                    <span className="text-xs opacity-50 font-normal ml-1">
                      1 credit
                    </span>
                  </>
                )}
              </button>
            ) : (
              <>
                {/* Live status pill */}
                <div className="flex items-center gap-2 px-3">
                  <span
                    className="size-1.5 rounded-full bg-success-100 animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-success-100 uppercase tracking-wider">
                    Live
                  </span>
                </div>

                {/* Separator */}
                <div className="flex-1" />

                {/* End button */}
                <button
                  onClick={handleDisconnect}
                  disabled={isPostCallLoading}
                  aria-label="End interview session"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-destructive-100 text-white text-sm font-semibold hover:bg-destructive-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneOff size={14} aria-hidden="true" />
                  End Session
                  <ChevronRight size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="h-24" aria-hidden="true" />
      </div>
    </>
  );
};

export default Agent;
