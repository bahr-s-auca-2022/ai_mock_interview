import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import InterviewCard from "@/components/InterviewCard";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

const page = async () => {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-light-100 mb-4">
            Welcome to AI Mock Interview
          </h2>
          <p className="text-light-100/80 mb-6">
            Please sign in to access your interviews
          </p>
          <Button asChild className="btn-primary">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [userInterviews, latestInterviews] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
  ]);

  const hasPastInterviews = userInterviews && userInterviews.length > 0;
  const hasUpcomingInterviews = latestInterviews && latestInterviews.length > 0;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-accent-teal/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-mustard/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div className="card-cta relative z-10">
          <div className="flex flex-col gap-8 max-w-2xl">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-accent-mustard via-primary-100 to-accent-teal bg-clip-text text-transparent">
                  Master Your
                </span>
                <br />
                <span className="text-light-100">Interview </span>
              </h1>

              <p className="text-xl lg:text-2xl text-light-100/80 leading-relaxed font-light">
                Transform interview anxiety into{" "}
                <span className="text-accent-mustard font-semibold">
                  confidence
                </span>{" "}
                with our AI-powered platform that provides{" "}
                <span className="text-accent-teal font-semibold">
                  real-time feedback
                </span>{" "}
                and
                <span className="text-primary-100 font-semibold">
                  {" "}
                  personalized coaching
                </span>
                .
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-light-100/90">
                <div className="w-2 h-2 bg-accent-mustard rounded-full"></div>
                <span className="text-lg">
                  Practice with realistic AI interviewers
                </span>
              </div>
              <div className="flex items-center gap-3 text-light-100/90">
                <div className="w-2 h-2 bg-accent-teal rounded-full"></div>
                <span className="text-lg">
                  Get detailed feedback on communication & content
                </span>
              </div>
              <div className="flex items-center gap-3 text-light-100/90">
                <div className="w-2 h-2 bg-primary-100 rounded-full"></div>
                <span className="text-lg">
                  Available in both English and Farsi, coming soon
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Button
                asChild
                className="btn-primary text-lg py-7 px-12 hover:scale-105 transition-transform duration-200 shadow-2xl"
              >
                <Link href="/interview" className="flex items-center gap-2">
                  <span>Start an interview</span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative">
              <Image
                src="/robot1.png"
                alt="AI Interview Assistant"
                width={480}
                height={480}
                className="max-sm:hidden animate-float z-20 relative"
                priority
              />

              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-teal/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-accent-mustard/15 rounded-full blur-xl animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-light-400">
          <div className="w-6 h-10 border-2 border-light-400/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-accent-mustard rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2 className="text-gray-300">Your Interviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          {hasPastInterviews ? (
            userInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg">
                You haven&apos;t taken any interviews yet.
              </p>
              <Button asChild className="mt-4 btn-primary">
                <Link href="/interview">Start Your First Interview</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2 className="text-gray-300">Take an interview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          {hasUpcomingInterviews ? (
            latestInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg">
                There are no interviews available from other users yet.
              </p>
              <p className="text-gray-500 mt-2">
                Create an interview first, then others can practice with it!
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default page;
