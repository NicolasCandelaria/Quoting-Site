"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-page-title font-semibold text-text-primary sm:text-[28px]">
          Quote Sheet
        </h1>
        <p className="max-w-xl text-body text-text-secondary">
          Build and share client-facing quote sheets. Create projects, add items
          with pricing, and export PDFs for procurement.
        </p>
      </header>

      <section className="card flex flex-col gap-4 transition-all duration-glass ease-glass hover:-translate-y-0.5 hover:shadow-glass-card-hover">
        <h2 className="text-section-title font-semibold text-text-primary">
          Get started as an account manager
        </h2>
        <p className="text-body text-text-secondary">
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
