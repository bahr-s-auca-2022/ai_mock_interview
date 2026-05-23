import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getUserQuestions,
  getUserTags,
} from "@/lib/actions/questionBank.action";
import { QuestionBankClient } from "@/components/QuestionBankClient";

export default async function QuestionBankPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [questions, tags] = await Promise.all([
    getUserQuestions(),
    getUserTags(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <QuestionBankClient
        initialQuestions={questions}
        availableTags={tags}
        userName={user.name}
      />
    </main>
  );
}
