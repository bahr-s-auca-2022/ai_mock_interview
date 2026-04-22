import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { CreditBalance } from "@/components/CreditBalance";

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-dark-100 selection:bg-accent-mustard/30">
      {/* Sticky header */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-dark-100/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between h-20 px-6 lg:px-12">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
          >
            <div className="relative">
              <Image
                src="/logo2.png"
                alt="EchoMock logo"
                width={38}
                height={32}
                className="relative z-10"
              />
              <div className="absolute inset-0 bg-accent-mustard/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h2 className="text-primary-100 text-xl font-bold tracking-tight">
              EchoMock
            </h2>
          </Link>

          {/* ── Right-side nav ───────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-light-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>

            <div className="h-4 w-[1px] bg-white/10" aria-hidden="true" />

            <Link
              href="/billing"
              className="text-sm font-medium text-light-400 hover:text-white transition-colors"
            >
              Billing
            </Link>

            <div className="h-4 w-[1px] bg-white/10" aria-hidden="true" />

            {/*
              CreditBalance — live badge showing the user's current credit
              count. Turns red when balance ≤ 1. Clicking it goes to /billing.
              It is a Client Component that fetches the balance on mount.
            */}
            <CreditBalance />

            <div className="h-4 w-[1px] bg-white/10" aria-hidden="true" />

            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 lg:px-12 py-12 animate-fadeIn">
        {children}
      </main>
    </div>
  );
};

export default RootLayout;
