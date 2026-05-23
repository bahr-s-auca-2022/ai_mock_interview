import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { CreditBalance } from "@/components/CreditBalance";
import NavLinks from "@/components/NavLinks";

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <div className="relative min-h-screen bg-dark-100/85 selection:bg-accent-mustard/20 selection:text-accent-mustard overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(122,158,159,0.06) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")
          `,
          backgroundSize: "100% 100%, 256px 256px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.022]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d4a55d 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="sticky top-0 z-50 w-full">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        <nav
          className="relative bg-dark-100/60 backdrop-blur-xl"
          aria-label="Main navigation"
        >
          <div className="mx-auto max-w-7xl flex items-center justify-between h-16 px-5 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="EchoMock — go to dashboard"
            >
              <div className="relative size-8 flex-center">
                <Image
                  src="/logo2.png"
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={28}
                  className="relative z-10 object-contain transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-accent-mustard/15 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-light-100">
                EchoMock
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLinks />
            </div>

            <div className="flex items-center gap-3">
              <CreditBalance />
              <div
                className="hidden md:block h-4 w-px bg-white/10"
                aria-hidden="true"
              />
              <LogoutButton />
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 lg:px-10 py-10 animate-fadeIn">
        {children}
      </main>
    </div>
  );
};

export default RootLayout;
