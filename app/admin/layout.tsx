\"use client\";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (slides in on mobile, fixed on desktop) */}
      <AdminSidebar open={sidebarOpen} />

      {/* Backdrop for mobile when sidebar is open */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col md:pl-[276px]">
        {/* Top bar on mobile with burger menu */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-text-secondary">Admin</span>
        </header>

        <main className="min-h-screen flex-1 px-4 pb-8 pt-4 md:px-8 md:pt-8 max-w-[1280px]">
          {children}
        </main>
      </div>
    </div>
  );
}
