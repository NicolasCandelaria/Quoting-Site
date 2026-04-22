import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNav } from "@/components/ConditionalNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Quote Sheet",
  description: "Build and share client-facing quote sheets",
  icons: {
    icon: "/images/favicon.png",
  },
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
