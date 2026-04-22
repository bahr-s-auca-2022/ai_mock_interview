"use client";

// components/Agent.tsx — Full version with credit checking and deduction.

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, PhoneOff, User, Loader2, Zap, AlertTriangle } from "lucide-react";
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

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
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
  const [lastMessage, setLastMessage] = useState<string>("");
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const hasGeneratedFeedback = useRef(false);
  const isNavigating = useRef(false);

  const hasNoCredits = !creditsLoading && credits !== null && credits < 1;

  const handleGenerateFeedback = useCallback(
    async (msgs: SavedMessage[]) => {
      if (hasGeneratedFeedback.current) return;
      hasGeneratedFeedback.current = true;
      setIsGeneratingFeedback(true);
      try {
        const result = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: msgs,
          feedbackId,
        });
        if (result.success && result.feedbackId) {
          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push(`/interview/${interviewId}/feedback`);
          }
        } else {
          toast.error("Could not generate feedback. Returning to dashboard.");
          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push("/");
          }
        }
      } catch (error) {
        console.error("[Agent] Feedback generation error:", error);
        toast.error("An unexpected error occurred. Returning to dashboard.");
        if (!isNavigating.current) {
          isNavigating.current = true;
          router.push("/");
        }
      } finally {
        setIsGeneratingFeedback(false);
      }
    },
    [interviewId, userId, feedbackId, router],
  );

  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
    };
    const onMessage = (message: VapiTranscriptMessage) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        setMessages((prev) => [
          ...prev,
          { role: message.role, content: message.transcript },
        ]);
      }
    };
    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) =>
      console.error("[Agent] VAPI error:", error);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("message", onMessage as any);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapi.off("message", onMessage as any);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0)
      setLastMessage(messages[messages.length - 1].content);
  }, [messages]);

  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED || isNavigating.current) return;
    if (type === "generate") {
      isNavigating.current = true;
      router.push("/");
      return;
    }
    if (type === "practice" && interviewId) {
      if (messages.length > 0 && !hasGeneratedFeedback.current) {
        handleGenerateFeedback(messages);
      } else if (messages.length === 0) {
        toast.warning("No transcript recorded. Returning to dashboard.");
        isNavigating.current = true;
        router.push("/");
      }
      return;
    }
    isNavigating.current = true;
    router.push("/");
  }, [callStatus, type, interviewId, messages, handleGenerateFeedback, router]);

  const handleCall = async () => {
    if (credits !== null && credits < 1) {
      toast.error("You have no credits left. Please top up to continue.", {
        action: {
          label: "Buy Credits",
          onClick: () => router.push("/billing"),
        },
      });
      return;
    }

    setCallStatus(CallStatus.CONNECTING);
    hasGeneratedFeedback.current = false;
    isNavigating.current = false;
    setMessages([]);

    // Atomically deduct 1 credit server-side BEFORE starting the VAPI session.
    const deduction = await deductCredit(type);
    if (!deduction.success) {
      toast.error(deduction.error ?? "Billing error. Please try again.", {
        action: { label: "Top Up", onClick: () => router.push("/billing") },
      });
      setCallStatus(CallStatus.INACTIVE);
      return;
    }

    // Refresh balance display immediately after deduction.
    await refreshCredits();

    try {
      if (type === "generate") {
        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
        if (!workflowId) {
          toast.error("Configuration error. Please contact support.");
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
        await vapi.start(workflowId, {
          variableValues: { username: userName || "Candidate", userid: userId },
        });
      } else {
        if (!questions || questions.length === 0) {
          toast.error(
            "No questions available. Please generate an interview first.",
          );
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
        const formattedQuestions = questions.map((q) => `- ${q}`).join("\n");
        await vapi.start(interviewer, {
          variableValues: { questions: formattedQuestions },
        });
      }
    } catch (error) {
      console.error("[Agent] Error starting VAPI call:", error);
      toast.error("Failed to start interview. Please try again.");
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const callButtonLabel =
    callStatus === CallStatus.CONNECTING
      ? "Connecting to interview, please wait"
      : type === "generate"
        ? "Create new interview"
        : "Start interview";

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto py-6 animate-fadeIn min-h-[75vh] relative">
      {/* No-credits alert */}
      {hasNoCredits && callStatus === CallStatus.INACTIVE && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
        >
          <AlertTriangle
            size={20}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-semibold text-red-300">No credits remaining</p>
            <p className="text-sm opacity-80 mt-0.5">
              You need at least 1 credit to start a voice session.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 flex items-center gap-1.5 bg-accent-mustard text-dark-100 text-sm font-bold px-4 py-2 rounded-full hover:bg-accent-mustard/90 transition-colors"
          >
            <Zap size={14} aria-hidden="true" />
            Top Up
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 items-stretch h-[380px]">
        {/* AI card */}
        <div
          role="status"
          aria-label={
            isSpeaking
              ? "EchoMock AI interviewer is speaking"
              : "EchoMock AI interviewer"
          }
          className={cn(
            "relative flex flex-col items-center justify-center rounded-[40px] border transition-all duration-700 overflow-hidden",
            isSpeaking
              ? "border-accent-mustard/40 bg-dark-200 shadow-[0_0_40px_-10px_rgba(212,165,93,0.2)]"
              : "border-white/5 bg-dark-200/40",
          )}
        >
          <div className="absolute inset-0 artistic-dots opacity-10 pointer-events-none" />
          <div className="relative z-10 size-32 md:size-40 flex-center">
            {isSpeaking && (
              <div
                className="absolute inset-0 rounded-full animate-ping bg-accent-mustard/15"
                aria-hidden="true"
              />
            )}
            <div
              className={cn(
                "relative z-10 size-full rounded-full bg-gradient-to-b from-dark-300 to-dark-100 border border-white/10 flex-center shadow-2xl transition-transform duration-500",
                isSpeaking && "scale-105",
              )}
            >
              <Image
                src="/logo2.png"
                alt="EchoMock AI interviewer avatar"
                width={70}
                height={60}
                className="object-contain animate-pulse"
              />
            </div>
          </div>
          <div className="mt-8 text-center z-10">
            <span
              className="text-accent-mustard text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block"
              aria-hidden="true"
            >
              Interviewer
            </span>
            <h3 className="text-white text-xl font-semibold">
              EchoMock Assistant
            </h3>
          </div>
          <div
            className="absolute bottom-0 left-0 w-full flex items-end justify-center gap-1 px-10 h-8 opacity-40"
            aria-hidden="true"
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-accent-mustard rounded-t-full transition-all duration-300",
                  isSpeaking ? "h-full" : "h-1",
                )}
                style={{ transitionDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Candidate card */}
        <div className="relative flex flex-col items-center justify-center rounded-[40px] border border-white/5 bg-dark-300/20 overflow-hidden">
          <div className="relative z-10 size-32 md:size-40 rounded-full overflow-hidden border-2 border-accent-teal/20 p-1">
            <div className="size-full rounded-full overflow-hidden bg-dark-100 flex-center">
              <User
                size={60}
                className="text-light-400 opacity-50"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="mt-8 text-center">
            <span
              className="text-light-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block"
              aria-hidden="true"
            >
              Candidate
            </span>
            <h3 className="text-white text-xl font-semibold">
              {userName || "Candidate"}
            </h3>
          </div>
          {!creditsLoading &&
            credits !== null &&
            callStatus === CallStatus.INACTIVE && (
              <div
                className={cn(
                  "absolute bottom-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  credits < 1
                    ? "bg-red-500/20 text-red-400"
                    : "bg-accent-mustard/10 text-accent-mustard",
                )}
                aria-label={`${credits} interview credits remaining`}
              >
                <Zap size={11} aria-hidden="true" />
                <span>
                  {credits} {credits === 1 ? "credit" : "credits"} remaining
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 flex flex-col items-center justify-center py-10">
        {isGeneratingFeedback ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Generating your interview feedback"
            className="flex flex-col items-center gap-4"
          >
            <Loader2
              size={32}
              className="animate-spin text-accent-teal"
              aria-hidden="true"
            />
            <p className="text-light-100/80 text-lg">
              Generating your feedback...
            </p>
            <p className="text-light-100/60 text-sm">
              This may take a moment...
            </p>
          </div>
        ) : messages.length > 0 ? (
          <div className="w-full max-w-2xl text-center px-6">
            <div className="flex items-center justify-center gap-2 text-accent-teal mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                Live Transcript
              </span>
            </div>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-2xl md:text-3xl text-light-100 font-medium leading-relaxed italic opacity-90 transition-all duration-500 animate-fadeIn"
            >
              &ldquo;{lastMessage}&rdquo;
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-4 opacity-30"
            aria-live="polite"
            role="status"
          >
            <p className="text-light-400 font-medium text-sm tracking-wide">
              {callStatus === CallStatus.INACTIVE
                ? hasNoCredits
                  ? "Top up your credits to start a session"
                  : type === "generate"
                    ? "Click 'Create New Interview' to start"
                    : "Click 'Start Interview' to begin"
                : callStatus === CallStatus.CONNECTING
                  ? "Establishing connection..."
                  : "Waiting for conversation to begin..."}
            </p>
          </div>
        )}
      </div>

      {/* Floating controls */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6">
        <div className="bg-dark-200/80 backdrop-blur-2xl border border-white/10 p-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
          {callStatus !== CallStatus.ACTIVE ? (
            <button
              onClick={handleCall}
              disabled={
                callStatus === CallStatus.CONNECTING ||
                isGeneratingFeedback ||
                hasNoCredits ||
                creditsLoading
              }
              aria-label={
                hasNoCredits
                  ? "No credits remaining. Visit billing to top up."
                  : callButtonLabel
              }
              aria-busy={callStatus === CallStatus.CONNECTING}
              className="w-full group flex items-center justify-center gap-3 bg-accent-mustard hover:bg-accent-mustard/90 text-dark-100 font-bold py-4 rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {callStatus === CallStatus.CONNECTING ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  <span>Connecting...</span>
                </>
              ) : hasNoCredits ? (
                <>
                  <Zap size={20} aria-hidden="true" />
                  <span>No Credits — Top Up</span>
                </>
              ) : (
                <>
                  <Mic size={20} aria-hidden="true" />
                  <span>
                    {type === "generate"
                      ? "Create New Interview"
                      : "Start Interview"}
                  </span>
                  <span className="text-xs opacity-60 font-normal">
                    — 1 credit
                  </span>
                </>
              )}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 ml-6" aria-hidden="true">
                <div className="size-2 rounded-full bg-success-100 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Live
                </span>
              </div>
              <span className="sr-only">Interview in progress</span>
              <button
                onClick={handleDisconnect}
                disabled={isGeneratingFeedback}
                aria-label="End interview session"
                className="flex items-center gap-3 bg-destructive-100 hover:bg-destructive-200 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105 disabled:opacity-50"
              >
                <PhoneOff size={18} aria-hidden="true" />
                <span>End Session</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Agent;
