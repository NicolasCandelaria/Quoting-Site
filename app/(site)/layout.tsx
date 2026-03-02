import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <main className="page-main">{children}</main>;
}

