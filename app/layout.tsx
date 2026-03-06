import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNav } from "@/components/ConditionalNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Quote Sheet",
  description: "Build and share client-facing quote sheets",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="page-shell font-sans">
        <ConditionalNav />
        {children}
      </body>
    </html>
  );
}
