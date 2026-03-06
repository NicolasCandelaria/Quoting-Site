import type { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto mt-8 w-full max-w-[1100px] flex-1 px-8 pt-8 pb-8">
      {children}
    </main>
  );
}

