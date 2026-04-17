"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/models";
import { fetchProjects } from "@/lib/api";
import {
  getLastAdminProjectId,
  rememberAdminProjectContext,
} from "@/lib/admin-last-project";
import { createClient } from "@/lib/supabase/client";
import { Home, Calculator, Image, BarChart3, ClipboardList, LogOut } from "lucide-react";

type AdminSidebarProps = {
  /**
   * Controls the slide-in visibility on mobile. On desktop, the sidebar is
   * always visible regardless of this value.
   */
  open?: boolean;
};

export function AdminSidebar({ open = true }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

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
      setLastProjectId(getLastAdminProjectId());
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [pathname]);

  useEffect(() => {
    const match = pathname.match(/^\/admin\/projects\/([^/]+)/);
    setSelected(match?.[1] ?? "");
  }, [pathname]);

  useEffect(() => {
    setLastProjectId(getLastAdminProjectId());
  }, [pathname]);

  const handleJump = (projectId: string) => {
    if (!projectId) return;
    rememberAdminProjectContext(projectId);
    router.push(`/admin/projects/${projectId}`);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen w-[240px] shrink-0 border-r border-[#16124a] shadow-sm transition-transform duration-300 md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ backgroundColor: "#1e195b" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/images/sidebar%20background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "soft-light",
          opacity: 0.8,
        }}
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col gap-4 pt-6">
        <div className="px-3">
          <Link href="/admin" className="inline-flex items-center gap-2" aria-label="Quote Sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="Quote Sheet" className="h-14 w-auto" />
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          <Link
            href="/admin"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/admin"
                ? "bg-white/20 text-white"
                : "text-[#c8c4e8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            Home
          </Link>
          <Link
            href="/admin/quick-profit-calculator"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/admin/quick-profit-calculator"
                ? "bg-white/20 text-white"
                : "text-[#c8c4e8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <Calculator className="h-5 w-5 shrink-0" />
            Quick Profit Calculator
          </Link>
          <Link
            href="/admin/art-approvals"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/admin/art-approvals"
                ? "bg-white/20 text-white"
                : "text-[#c8c4e8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <Image className="h-5 w-5 shrink-0" />
            Art Approvals
          </Link>
          <Link
            href="/admin/item-performance-analytics"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/admin/item-performance-analytics"
                ? "bg-white/20 text-white"
                : "text-[#c8c4e8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            Item Performance Analytics
          </Link>
          <Link
            href="/admin/rfp-dashboard"
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-body font-medium transition-colors ${
              pathname === "/admin/rfp-dashboard"
                ? "bg-white/20 text-white"
                : "text-[#c8c4e8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <ClipboardList className="h-5 w-5 shrink-0" />
            RFP Dashboard
          </Link>
        </nav>

        <div className="mt-2 flex flex-col gap-1 px-3">
          <label className="text-caption font-medium text-[#a8a3d4]">Projects</label>
          <select
            className="input h-9 w-full cursor-pointer border-[#2d2869] bg-white/10 text-white text-caption placeholder:text-[#a8a3d4] focus:border-white/40 focus:ring-white/20"
            value={selected}
            onChange={(e) => handleJump(e.target.value)}
          >
            <option value="">{projects.length ? "Jump to project…" : "No projects"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1e195b] text-white">
                {p.name} — {p.client}
              </option>
            ))}
          </select>
          {lastProjectId ? (
            <Link
              href={`/admin/projects/${lastProjectId}#project-items`}
              className="block rounded-lg px-2 py-2 text-caption font-medium text-[#c8c4e8] transition-colors hover:bg-white/10 hover:text-white"
            >
              Back to last project’s items
            </Link>
          ) : null}
        </div>

        <div className="mt-auto border-t border-white/10 px-3 pt-4 pb-6">
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
              router.refresh();
            }}
            className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-body font-medium text-[#c8c4e8] transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
