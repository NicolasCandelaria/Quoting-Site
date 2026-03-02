"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Quote Sheet Demo
        </h1>
        <p className="text-sm text-zinc-600 max-w-xl">
          Lightweight internal tool for building client-facing project quote
          sheets. All data is stored locally in your browser via{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            localStorage
          </code>
          .
        </p>
      </header>

      <section className="card p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-950">
          Get started as an account manager
        </h2>
        <p className="text-sm text-zinc-600">
          Create and manage projects, add items, and generate client-ready quote
          sheets.
        </p>
        <div>
          <Link href="/admin" className="btn-primary">
            Open Admin
          </Link>
        </div>
      </section>
    </div>
  );
}

