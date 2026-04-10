import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const page = async () => {
  const user = await getCurrentUser();

  // ✅ Add this check
  if (!user || !user.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-light-100 mb-4">
            Please sign in to create an interview
          </h2>
          <Button asChild className="btn-primary">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      <header className="mb-12 border-b border-white/5 pb-8">
        <div className="flex items-center gap-2 text-accent-teal mb-2">
          <Sparkles size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">
            Phase 01
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Create AI Interview
        </h1>
        <p className="text-light-100/60 mt-2">
          Answer a few questions and our AI will generate a custom interview for
          you
        </p>
      </header>

      <Agent userName={user.name} userId={user.id} type="generate" />
    </div>
  );
};

export default page;
