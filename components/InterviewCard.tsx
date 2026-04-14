import dayjs from "dayjs";
import Image from "next/image";
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { getRandomInterviewCover } from "@/lib/utils";
import DisplayTechIncons from "./DisplayTechIncons";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

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

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now(),
  ).format("MMM D, YYYY");

  // Determine if the interview has been taken (feedback exists)
  const hasTakenInterview = !!feedback;

  return (
    <div className="card-border w-full min-h-96 hover:scale-[1.02] transition-all duration-300">
      <div className="card p-6 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 px-4 py-2 bg-accent-teal/20 backdrop-blur-sm border-b border-l border-accent-teal/30 rounded-bl-xl">
          <p className="text-sm font-semibold text-accent-teal">
            {normalizedType}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <Image
            src={getRandomInterviewCover()}
            alt="cover image"
            width={90}
            height={90}
            className="rounded-full object-cover border-2 border-accent-mustard/40 shadow-md"
          />

          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-light-100 capitalize">
              {role} Interview
            </h3>

            <div className="flex flex-wrap gap-4 mt-2 text-light-400">
              <div className="flex items-center gap-2">
                <Image
                  src="/calendar.svg"
                  alt="calendar"
                  width={18}
                  height={18}
                />
                <p className="text-sm">{formattedDate}</p>
              </div>

              <div className="flex items-center gap-2">
                <Image src="/star.svg" alt="star" width={18} height={18} />
                <p className="text-sm">
                  {hasTakenInterview && feedback?.totalScore !== undefined
                    ? `${feedback.totalScore}/100`
                    : "---/100"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-light-100/80 line-clamp-3 min-h-[60px]">
          {hasTakenInterview && feedback?.finalAssessment
            ? feedback.finalAssessment
            : "You have not taken the interview yet. Start now to improve your skills."}
        </p>

        <div className="flex justify-between items-center mt-auto pt-4 border-t border-light-400/20">
          <DisplayTechIncons techStack={techstack} />

          <Link
            href={
              hasTakenInterview
                ? `/interview/${interviewId}/feedback`
                : `/interview/${interviewId}`
            }
          >
            <Button className="btn-primary">
              {hasTakenInterview ? "Check Feedback" : "View Interview"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
