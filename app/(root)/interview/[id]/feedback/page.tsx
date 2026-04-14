import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/sign-in");
  }

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  // Add retry logic for fetching feedback
  let feedback = null;
  let retries = 3;

  while (retries > 0 && !feedback) {
    feedback = await getFeedbackByInterviewId({
      interviewId: id,
      userId: user.id,
    });

    if (!feedback) {
      console.log(`Feedback not found, retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      retries--;
    }
  }

  console.log("Feedback data:", feedback);

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="flex flex-row justify-center mt-4">
        <div className="flex flex-row gap-5">
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Score:{" "}
              <span className="text-primary-200 font-bold">
                {feedback?.totalScore ?? "N/A"}
              </span>
              /100
            </p>
          </div>

          <div className="flex flex-row gap-2">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>
              {feedback?.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr className="my-6" />

      {!feedback ? (
        <div className="text-center py-8">
          <p className="text-light-100/60">
            Feedback is being generated. Please wait a moment and refresh the
            page.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="btn-primary mt-4"
          >
            Refresh Page
          </Button>
        </div>
      ) : (
        <>
          <p className="text-light-100/80">
            {feedback.finalAssessment || "No assessment available."}
          </p>

          {/* Interview Breakdown */}
          {feedback.categoryScores && feedback.categoryScores.length > 0 && (
            <div className="flex flex-col gap-4 mt-6">
              <h2 className="text-xl font-semibold">
                Breakdown of the Interview:
              </h2>
              {feedback.categoryScores.map((category: any, index: number) => (
                <div key={index} className="bg-dark-200/50 p-4 rounded-lg">
                  <p className="font-bold text-accent-teal">
                    {index + 1}. {category.name} ({category.score}/100)
                  </p>
                  <p className="text-light-100/70 mt-2">{category.comment}</p>
                </div>
              ))}
            </div>
          )}

          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="flex flex-col gap-3 mt-6">
              <h3 className="text-xl font-semibold text-success-100">
                Strengths
              </h3>
              <ul className="list-disc list-inside space-y-2">
                {feedback.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-light-100/80">
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.areasForImprovement &&
            feedback.areasForImprovement.length > 0 && (
              <div className="flex flex-col gap-3 mt-6">
                <h3 className="text-xl font-semibold text-destructive-100">
                  Areas for Improvement
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  {feedback.areasForImprovement.map(
                    (area: string, index: number) => (
                      <li key={index} className="text-light-100/80">
                        {area}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
        </>
      )}

      <div className="buttons flex gap-4 mt-8">
        <Button className="btn-secondary flex-1" asChild>
          <Link href="/">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1" asChild>
          <Link href={`/interview/${id}`}>
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
