import type { ReactNode } from "react";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata = {
  title: "Quote Sheet Demo",
  description: "Lightweight quote sheet MVP for internal demos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="page-shell">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
