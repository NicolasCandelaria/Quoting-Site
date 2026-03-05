import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="page-main !py-6 md:!py-8">{children}</main>
    </div>
  );
}

