"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/billing", label: "Billing" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label }, i) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className="mx-1 h-3.5 w-px bg-white/10"
                aria-hidden="true"
              />
            )}
            <Link
              href={href}
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150",
                isActive
                  ? "text-light-100"
                  : "text-light-400 hover:text-light-100",
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-md bg-white/6" />
              )}
              <span className="relative">{label}</span>
            </Link>
          </span>
        );
      })}
    </>
  );
}
