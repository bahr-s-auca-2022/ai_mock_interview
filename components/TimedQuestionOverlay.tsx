"use client";

import { useMemo } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimedQuestionOverlayProps {
  currentIndex: number;
  totalQuestions: number;
  question: string;
  timeRemaining: number;
  timeLimitSeconds: number;
  onSkip: () => void;
  isLastQuestion: boolean;
}

export function TimedQuestionOverlay({
  currentIndex,
  totalQuestions,
  question,
  timeRemaining,
  timeLimitSeconds,
  onSkip,
  isLastQuestion,
}: TimedQuestionOverlayProps) {
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = timeRemaining / timeLimitSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const fraction = timeRemaining / timeLimitSeconds;

  const ringColour = useMemo(() => {
    if (fraction > 0.5) return "#4ade80";
    if (fraction > 0.2) return "#fbbf24";
    return "#f87171";
  }, [fraction]);

  const textColour = useMemo(() => {
    if (fraction > 0.5) return "text-green-400";
    if (fraction > 0.2) return "text-amber-400";
    return "text-red-400";
  }, [fraction]);

  const isUrgent = fraction <= 0.2;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="rounded-3xl border border-white/10 bg-dark-200/60 backdrop-blur-md p-6 md:p-8 space-y-6">
        {/* ── Header row: progress + timer ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          {/* Question progress pill */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-light-400" aria-hidden="true" />
            <span className="text-light-400 text-xs font-medium uppercase tracking-widest">
              Question{" "}
              <span className="text-white font-bold">{currentIndex + 1}</span>{" "}
              of <span className="text-white font-bold">{totalQuestions}</span>
            </span>
          </div>

          <div
            className="relative flex items-center justify-center"
            aria-label={`${timeRemaining} seconds remaining`}
          >
            <svg
              width={64}
              height={64}
              viewBox="0 0 128 128"
              className="-rotate-90"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx={64}
                cy={64}
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={10}
              />
              <circle
                cx={64}
                cy={64}
                r={RADIUS}
                fill="none"
                stroke={ringColour}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{
                  transition: "stroke-dashoffset 1s linear, stroke 0.5s ease",
                }}
              />
            </svg>
            <span
              className={cn(
                "absolute text-lg font-bold tabular-nums transition-colors",
                textColour,
                isUrgent && "animate-pulse",
              )}
            >
              {timeRemaining}
            </span>
          </div>
        </div>

        <div
          className="w-full h-1 bg-white/10 rounded-full overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: ringColour,
            }}
          />
        </div>

        <div>
          <p className="text-[10px] text-accent-teal font-bold uppercase tracking-[0.2em] mb-3">
            Current Question
          </p>
          <p
            className="text-white text-lg md:text-xl font-medium leading-relaxed"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {question}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onSkip}
            aria-label={
              isLastQuestion
                ? "Finish interview — no more questions"
                : `Skip to question ${currentIndex + 2}`
            }
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
              isLastQuestion
                ? "bg-accent-mustard text-dark-100 hover:bg-accent-mustard/90"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
          >
            <span>{isLastQuestion ? "Finish" : "Skip"}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
