import dayjs from "dayjs";
import Image from "next/image";
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { getRandomInterviewCover } from "@/lib/utils";
import DisplayTechIncons from "./DisplayTechIncons";

interface InterviewCardProps {
  interviewId: string;
  userId: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt: string;
}

interface Feedback {
  createdAt: string;
  totalScore?: number;
  finalAssessment?: string;
}

const InterviewCard = ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
}: InterviewCardProps) => {
  const feedback = null as Feedback | null;

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;
  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now()
  ).format("MMM D, YYYY");

  return (
    <div className="card-border w-full min-h-96 hover:scale-[1.02] transition-all duration-300">
      <div className="card p-6 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Badge */}
        <div className="absolute top-0 right-0 px-4 py-2 bg-accent-teal/20 backdrop-blur-sm border-b border-l border-accent-teal/30 rounded-bl-xl">
          <p className="text-sm font-semibold text-accent-teal">
            {normalizedType}
          </p>
        </div>

        {/* Header */}
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
                <p className="text-sm">{feedback?.totalScore || "---"}/100</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment */}
        <p className="text-light-100/80 line-clamp-3 min-h-[60px]">
          {feedback?.finalAssessment ||
            "You have not taken the interview yet. Start now to improve your skills."}
        </p>

        {/* Tech + CTA */}
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-light-400/20">
          <DisplayTechIncons techStack={techstack} />

          <Link
            href={
              feedback
                ? `/interview/${interviewId}/feedback`
                : `/interview/${interviewId}`
            }
          >
            <Button className="btn-primary">
              {feedback ? "Check Feedback" : "View Interview"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
