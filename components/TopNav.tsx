"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/models";
import { fetchProjects } from "@/lib/api";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>("");

  const isClientView = useMemo(() => pathname.startsWith("/q/"), [pathname]);
  const currentProjectId = useMemo(() => {
    const match = pathname.match(/^\/q\/([^/]+)/);
    return match?.[1] ?? "";
  }, [pathname]);

  useEffect(() => {
    const load = async () => {
      try {
        setProjects(await fetchProjects());
      } catch {
        setProjects([]);
      }
    };

    void load();

    const refresh = () => {
      void load();
    };

    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [pathname]);

  useEffect(() => {
    const match = pathname.match(/^\/(?:admin\/projects|q)\/([^/]+)/);
    const projectId = match?.[1] ?? "";
    setSelected(projectId);
  }, [pathname]);

  const handleJump = (projectId: string) => {
    if (!projectId) return;
    const href = isClientView ? `/q/${projectId}` : `/admin/projects/${projectId}`;
    router.push(href);
  };

  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={isClientView && currentProjectId ? `/q/${currentProjectId}` : "/"}
            className="inline-flex items-center"
            aria-label="Quote Sheet"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Quote Sheet" className="h-7 w-auto" />
          </Link>
          {!isClientView && (
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <Link href="/" className="font-semibold text-zinc-950 hover:text-brand-700">Home</Link>
              <span className="text-zinc-300">/</span>
              <Link href="/admin" className="font-semibold text-zinc-950 hover:text-brand-700">Admin</Link>
            </div>
          )}
          {isClientView && (
            <span className="hidden text-sm font-semibold text-zinc-950 sm:inline">Quote Sheet</span>
          )}
        </div>

        {!isClientView && (
          <div className="flex items-center gap-2">
            <label className="hidden text-xs font-medium text-zinc-600 md:block">Projects</label>
            <select
              className="input !w-[220px] !py-1.5 !text-xs sm:!w-[320px] sm:!text-sm"
              value={selected}
              onChange={(e) => handleJump(e.target.value)}
            >
              <option value="">{projects.length ? "Jump to a project…" : "No projects yet"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.client}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
