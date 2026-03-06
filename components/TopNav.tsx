"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const isClientView = pathname.startsWith("/q/");
  const currentProjectId = pathname.match(/^\/q\/([^/]+)/)?.[1] ?? "";

  return (
    <header className="w-full border-b border-slate-200 bg-white/95 shadow-sm" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-8 py-3">
        <Link
          href={isClientView && currentProjectId ? `/q/${currentProjectId}` : "/"}
          className="inline-flex items-center gap-2"
          aria-label="Quote Sheet"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="Quote Sheet" className="h-7 w-auto" />
          {isClientView && (
            <span className="hidden text-section-title font-semibold text-text-primary sm:inline">
              Quote Sheet
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
