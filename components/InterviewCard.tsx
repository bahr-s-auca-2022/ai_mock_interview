import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Star, CheckCircle2 } from "lucide-react";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";
import DisplayTechIcons from "./DisplayTechIncons";

const COVER_IMAGES = ["/logo2.png"];

function getCoverImage(interviewId: string): string {
  let hash = 0;
  for (let i = 0; i < interviewId.length; i++) {
    hash = (hash + interviewId.charCodeAt(i)) % COVER_IMAGES.length;
  }
  return COVER_IMAGES[hash];
}

function getTypeMeta(type: string) {
  const t = type.toLowerCase();
  if (/mix/.test(t))
    return {
      label: "Mixed",
      color: "text-accent-mustard",
      dot: "bg-accent-mustard",
    };
  if (/tech/.test(t))
    return {
      label: "Technical",
      color: "text-accent-teal",
      dot: "bg-accent-teal",
    };
  return {
    label: "Behavioural",
    color: "text-accent-clay",
    dot: "bg-accent-clay",
  };
}

function ScoreDisplay({ score }: { score: number | undefined }) {
  if (score === undefined) {
    return (
      <span className="text-xs font-mono text-light-400/60 tabular-nums">
        —/100
      </span>
    );
  }
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 75
      ? "text-success-100"
      : pct >= 50
        ? "text-accent-mustard"
        : "text-destructive-100";
  return (
    <span className={`text-sm font-semibold tabular-nums ${color}`}>
      {pct}
      <span className="text-xs font-normal text-light-400/60">/100</span>
    </span>
  );
}

const InterviewCard = async ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
}: InterviewCardProps) => {
  const feedback =
    userId && interviewId
      ? await getFeedbackByInterviewId({ interviewId, userId })
      : null;

  const hasFeedback = !!feedback;
  const typeMeta = getTypeMeta(type);
  const coverSrc = getCoverImage(interviewId ?? "default");
  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now(),
  ).format("MMM D, YYYY");

  const href = hasFeedback
    ? `/interview/${interviewId}/feedback`
    : `/interview/${interviewId}`;

  const ctaLabel = hasFeedback ? "View Feedback" : "Start Interview";

  return (
    <article className="group relative flex flex-col rounded-2xl bg-dark-200 border border-white/6 overflow-hidden transition-all duration-200 hover:border-white/12 hover:bg-dark-200/90 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* ── Card body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Cover avatar */}
            <div className="shrink-0 size-11 rounded-xl overflow-hidden border border-white/8 bg-dark-300">
              <Image
                src={coverSrc}
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                className="size-full object-cover"
              />
            </div>

            {/* Role + date */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-light-100 capitalize truncate leading-snug">
                {role}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <CalendarDays
                  size={11}
                  className="text-light-400/60 shrink-0"
                  aria-hidden="true"
                />
                <time
                  dateTime={createdAt}
                  className="text-xs text-light-400/60"
                >
                  {formattedDate}
                </time>
              </div>
            </div>
          </div>

          {/* Type badge */}
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/8 bg-white/3">
            <span
              className={`size-1.5 rounded-full ${typeMeta.dot}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-medium ${typeMeta.color}`}>
              {typeMeta.label}
            </span>
          </div>
        </div>

        {/* ── Assessment text ─────────────────────────────────────────────── */}
        <p className="text-xs text-light-400/80 leading-relaxed line-clamp-3 min-h-[48px]">
          {hasFeedback && feedback?.finalAssessment
            ? feedback.finalAssessment
            : "You haven't taken this interview yet. Click below to start and get detailed AI feedback."}
        </p>

        {/* ── Tech icons ──────────────────────────────────────────────────── */}
        <div className="flex items-center">
          <DisplayTechIcons techStack={techstack} />
        </div>

        {/* ── Footer row ──────────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-white/6 flex items-center justify-between">
          {/* Score */}
          <div className="flex items-center gap-1.5">
            {hasFeedback ? (
              <CheckCircle2
                size={13}
                className="text-success-100"
                aria-hidden="true"
              />
            ) : (
              <Star
                size={13}
                className="text-light-400/40"
                aria-hidden="true"
              />
            )}
            <ScoreDisplay
              score={hasFeedback ? feedback?.totalScore : undefined}
            />
          </div>

          {/* CTA link */}
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-light-100 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-accent-mustard hover:border-accent-mustard hover:text-dark-100 transition-all duration-150 group/link"
            aria-label={`${ctaLabel} — ${role} interview`}
          >
            <span>{ctaLabel}</span>
            <ArrowRight
              size={11}
              aria-hidden="true"
              className="transition-transform duration-150 group-hover/link:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default InterviewCard;
