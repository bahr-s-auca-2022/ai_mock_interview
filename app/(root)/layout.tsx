import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated;
  if (!isUserAuthenticated) redirect("/sign-in");
  return (
    <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo2.png" alt="EchoMock Logo" width={42} height={36} />
          <h2 className="text-primary-100 text-2xl font-bold tracking-tight">
            EchoMock
          </h2>
        </Link>
      </nav>

      {children}
    </div>
  );
};

export default RootLayout;
