"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/TopNav";

export function ConditionalNav() {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return null;
  return <TopNav />;
}
