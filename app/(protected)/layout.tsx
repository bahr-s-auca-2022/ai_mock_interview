import { ReactNode } from "react";
import { isAuthenticated } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import Image from "next/image";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authenticated = await isAuthenticated();

  if (!authenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo2.png" alt="EchoMock Logo" width={42} height={36} />
          <h2 className="text-primary-100 text-2xl font-bold tracking-tight">
            EchoMock
          </h2>
        </Link>

        <LogoutButton />
      </nav>

      {children}
    </div>
  );
}
