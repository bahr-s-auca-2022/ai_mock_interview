import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Sparkles } from "lucide-react";

const page = async () => {
  const user = await getCurrentUser();

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
          AI Interview{" "}
          <span className="text-light-400 font-light">Simulation</span>
        </h1>
      </header>

      <Agent userName={user?.name} userId={user?.id} type="generate" />
    </div>
  );
};

export default page;
