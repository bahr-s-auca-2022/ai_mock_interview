"use client";

// components/LogoutButton.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { logout } from "@/lib/actions/auth.action";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    if (isPending) return;
    setIsPending(true);
    try {
      await signOut(auth);
      await logout();
      router.push("/sign-in");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      aria-label="Sign out of EchoMock"
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full",
        "text-sm font-medium text-light-400 hover:text-light-100",
        "border border-white/8 hover:border-white/15 bg-transparent hover:bg-white/4",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut size={13} aria-hidden="true" />
      )}
      <span>{isPending ? "Signing out…" : "Logout"}</span>
    </button>
  );
}
