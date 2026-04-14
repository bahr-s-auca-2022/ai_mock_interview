"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, PhoneOff, User, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

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

interface AgentProps {
  userName?: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "practice";
  questions?: string[];
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
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const hasGeneratedFeedback = useRef(false);
  const isNavigating = useRef(false);

  const handleGenerateFeedback = useCallback(
    async (messages: SavedMessage[]) => {
      if (isGeneratingFeedback || hasGeneratedFeedback.current) {
        console.log("Feedback generation already in progress or completed");
        return;
      }

      hasGeneratedFeedback.current = true;
      setIsGeneratingFeedback(true);

      try {
        console.log("=== FEEDBACK GENERATION STARTED ===");
        console.log("Interview ID:", interviewId);
        console.log("User ID:", userId);
        console.log("Messages count:", messages.length);

        const result = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages,
          feedbackId,
        });

        console.log("=== CREATE FEEDBACK RESULT ===", result);

        if (result.success && result.feedbackId) {
          console.log(
            "Feedback created successfully with ID:",
            result.feedbackId,
          );

          await new Promise((resolve) => setTimeout(resolve, 2000));

          console.log("Navigating to feedback page");

          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push(`/interview/${interviewId}/feedback`);
          }
        } else {
          console.error("Failed to create feedback:", result);
          if (!isNavigating.current) {
            isNavigating.current = true;
            router.push("/");
          }
        }
      } catch (error) {
        console.error("=== ERROR IN FEEDBACK GENERATION ===", error);
        if (!isNavigating.current) {
          isNavigating.current = true;
          router.push("/");
        }
      } finally {
        setIsGeneratingFeedback(false);
      }
    },
    [interviewId, userId, feedbackId, router, isGeneratingFeedback],
  );

  useEffect(() => {
    const onCallStart = () => {
      console.log("Call started");
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      console.log("Call ended");
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
    };

    const onMessage = (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage: SavedMessage = {
          role: message.role,
          content: message.transcript,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => console.error("VAPI Error:", error);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED && !isNavigating.current) {
      console.log("Call finished, type:", type);
      console.log("Messages available:", messages.length);

      if (type === "generate") {
        console.log("Generate mode - navigating to dashboard");
        isNavigating.current = true;
        router.push("/");
      } else if (type === "practice" && interviewId) {
        if (messages.length > 0 && !hasGeneratedFeedback.current) {
          console.log(
            "Practice mode - generating feedback with",
            messages.length,
            "messages",
          );

          handleGenerateFeedback(messages);
        } else if (messages.length === 0) {
          console.warn("No messages to generate feedback from");
          isNavigating.current = true;
          router.push("/");
        }
      } else {
        console.log("Default navigation to dashboard");
        isNavigating.current = true;
        router.push("/");
      }
    }
  }, [callStatus, type, interviewId, messages, handleGenerateFeedback, router]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    hasGeneratedFeedback.current = false;
    isNavigating.current = false;
    setMessages([]);

    try {
      if (type === "generate") {
        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

        if (!workflowId) {
          console.error("VAPI workflow ID is missing!");
          setCallStatus(CallStatus.INACTIVE);
          alert("Configuration error. Please try again later.");
          return;
        }

        console.log("Starting generate interview workflow");
        await vapi.start(workflowId, {
          variableValues: {
            username: userName || "Candidate",
            userid: userId,
          },
        });
      } else {
        if (!questions || questions.length === 0) {
          console.error("No questions provided for practice mode!");
          setCallStatus(CallStatus.INACTIVE);
          alert(
            "No interview questions available. Please generate an interview first.",
          );
          return;
        }

        console.log(
          "Starting practice interview with",
          questions.length,
          "questions",
        );
        let formattedQuestions = questions.map((q) => `- ${q}`).join("\n");
        await vapi.start(interviewer, {
          variableValues: { questions: formattedQuestions },
        });
      }
    } catch (error) {
      console.error("Error starting VAPI call:", error);
      setCallStatus(CallStatus.INACTIVE);
      alert("Failed to start interview. Please try again.");
    }
  };

  const handleDisconnect = () => {
    console.log("Manually disconnecting call");
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto py-6 animate-fadeIn min-h-[75vh] relative">
      <div className="grid md:grid-cols-2 gap-8 items-stretch h-[380px]">
        <div
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
              <div className="absolute inset-0 rounded-full animate-ping bg-accent-mustard/15" />
            )}

            <div
              className={cn(
                "relative z-10 size-full rounded-full bg-gradient-to-b from-dark-300 to-dark-100 border border-white/10 flex-center shadow-2xl transition-transform duration-500",
                isSpeaking && "scale-105",
              )}
            >
              <Image
                src="/logo2.png"
                alt="AI"
                width={70}
                height={60}
                className="object-contain animate-pulse"
              />
            </div>
          </div>

          <div className="mt-8 text-center z-10">
            <span className="text-accent-mustard text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block">
              Interviewer
            </span>
            <h3 className="text-white text-xl font-semibold">
              EchoMock Assistant
            </h3>
          </div>

          <div className="absolute bottom-0 left-0 w-full flex items-end justify-center gap-1 px-10 h-8 opacity-40">
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

        <div className="relative flex flex-col items-center justify-center rounded-[40px] border border-white/5 bg-dark-300/20 overflow-hidden">
          <div className="relative z-10 size-32 md:size-40 rounded-full overflow-hidden border-2 border-accent-teal/20 p-1">
            <div className="size-full rounded-full overflow-hidden bg-dark-100 flex-center">
              <User size={60} className="text-light-400 opacity-50" />
            </div>
          </div>
          <div className="mt-8 text-center">
            <span className="text-light-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block">
              Candidate
            </span>
            <h3 className="text-white text-xl font-semibold">
              {userName || "Candidate"}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-10">
        {isGeneratingFeedback ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-accent-teal" />
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
            <p className="text-2xl md:text-3xl text-light-100 font-medium leading-relaxed italic opacity-90 transition-all duration-500 animate-fadeIn">
              "{lastMessage}"
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 opacity-30 group">
            <p className="text-light-400 font-medium text-sm tracking-wide">
              {callStatus === CallStatus.INACTIVE
                ? type === "generate"
                  ? "Click 'Create New Interview' to start"
                  : "Click 'Start Interview' to begin"
                : callStatus === CallStatus.CONNECTING
                  ? "Establishing connection..."
                  : "Waiting for conversation to begin..."}
            </p>
          </div>
        )}
      </div>

      {/* --- FLOATING CONTROLS --- */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6">
        <div className="bg-dark-200/80 backdrop-blur-2xl border border-white/10 p-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
          {callStatus !== CallStatus.ACTIVE ? (
            <button
              onClick={handleCall}
              disabled={
                callStatus === CallStatus.CONNECTING || isGeneratingFeedback
              }
              className="w-full group flex items-center justify-center gap-3 bg-accent-mustard hover:bg-accent-mustard/90 text-dark-100 font-bold py-4 rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {callStatus === CallStatus.CONNECTING ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>
                    {type === "generate"
                      ? "Create New Interview"
                      : "Start Interview"}
                  </span>
                </>
              )}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 ml-6">
                <div className="size-2 rounded-full bg-success-100 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Live
                </span>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={isGeneratingFeedback}
                className="flex items-center gap-3 bg-destructive-100 hover:bg-destructive-200 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105 disabled:opacity-50"
              >
                <PhoneOff size={18} />
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
