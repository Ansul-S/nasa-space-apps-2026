"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { FEATURED_SITE } from "@/lib/data";

import { BrandMark } from "./BrandMark";

const NAV = [
  { href: "/", label: "Story", match: (p: string) => p === "/" },
  { href: "/planner/", label: "Planner", match: (p: string) => p.startsWith("/planner") },
  { href: `/sites/${FEATURED_SITE}/`, label: "Sites", match: (p: string) => p.startsWith("/sites") },
] as const;

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-50 h-(--header-h) border-b border-line bg-sky-0/80 backdrop-blur-[14px] backdrop-saturate-[1.2]">
      <div className="flex h-full items-center gap-5 px-[max(20px,env(safe-area-inset-left,0px))]">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline" aria-label="Wayfinders Frontier, home">
          <BrandMark />
          <span className="hidden font-mono text-[10.5px] font-medium tracking-[0.16em] whitespace-nowrap min-[440px]:inline sm:text-xs sm:tracking-[0.22em]">
            WAYFINDERS FRONTIER
          </span>
          <span className="hidden border-l border-line-2 pl-3 text-xs whitespace-nowrap text-ink-3 lg:inline">
            Seasonal analog planner
          </span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex gap-0.5 rounded-full border border-line bg-sky-1 p-[3px]">
          {NAV.map((item) => {
            const on = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative isolate rounded-full px-2.5 py-1.5 text-[13px] no-underline transition-colors duration-200 sm:px-3.5",
                  on ? "text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-sky-3 shadow-[inset_0_0_0_1px_var(--color-line-2)]"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
