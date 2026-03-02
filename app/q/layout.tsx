import type { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <main className="page-main">{children}</main>;
}

