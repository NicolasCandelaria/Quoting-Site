"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/models";
import { fetchProjects } from "@/lib/api";
import { Home, LayoutDashboard } from "lucide-react";

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setProjects(await fetchProjects());
      } catch {
        setProjects([]);
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [pathname]);

  useEffect(() => {
    const match = pathname.match(/^\/admin\/projects\/([^/]+)/);
    setSelected(match?.[1] ?? "");
  }, [pathname]);

  const handleJump = (projectId: string) => {
    if (!projectId) return;
    router.push(`/admin/projects/${projectId}`);
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-[240px] shrink-0 border-r border-slate-200 bg-white/95 shadow-sm"
      style={{
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div className="flex h-full flex-col gap-4 pt-6">
        <div className="px-3">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Quote Sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Quote Sheet" className="h-7 w-auto" />
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          <Link
            href="/"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/"
                ? "bg-active-bg text-active-text"
                : "text-text-secondary hover:bg-slate-100 hover:text-text-primary"
            }`}
          >
            <Home className="h-5 w-5 shrink-0 opacity-75" />
            Home
          </Link>
          <Link
            href="/admin"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-active-bg text-active-text"
                : "text-text-secondary hover:bg-slate-100 hover:text-text-primary"
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 opacity-75" />
            Admin
          </Link>
        </nav>

        <div className="mt-2 flex flex-col gap-1 px-3">
          <label className="text-caption font-medium text-text-tertiary">Projects</label>
          <select
            className="input h-9 w-full cursor-pointer text-caption"
            value={selected}
            onChange={(e) => handleJump(e.target.value)}
          >
            <option value="">{projects.length ? "Jump to project…" : "No projects"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.client}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
