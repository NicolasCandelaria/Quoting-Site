import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="min-h-screen flex-1 pl-[276px] pr-8 pt-8 pb-8 max-w-[1280px]">
        {children}
      </main>
    </div>
  );
}
