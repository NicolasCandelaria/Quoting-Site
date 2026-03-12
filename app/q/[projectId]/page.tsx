"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { getItemPreviewImage } from "@/lib/item-image";
import { fetchProject } from "@/lib/api";
import { formatQuoteDate } from "@/lib/format-date";
import { exportProjectPdf } from "@/lib/export-pdf";

export default function ClientProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchProject(projectId);
      setProject(data);
      setLoading(false);
    };

    void load();
  }, [projectId]);

  if (loading) {
    return <p className="text-body text-text-secondary">Loading quote sheet...</p>;
  }

  if (!project) {
    return <p className="text-body text-text-secondary">Quote sheet not found.</p>;
  }

  const items = project.items;
  const clientLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${projectId}`
      : `/q/${projectId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!project || exporting) return;
    try {
      setExporting(true);
      await exportProjectPdf(project);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption uppercase tracking-[0.2em] text-text-tertiary">Quote Sheet</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={handleCopyLink}>
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleDownloadPdf()}
              disabled={exporting || items.length === 0}
            >
              {exporting ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>
        <h1 className="text-page-title font-semibold text-text-primary">{project.name}</h1>
        <p className="text-body text-text-secondary">
          Prepared for <span className="font-medium text-text-primary">{project.client}</span>
        </p>
        {project.quoteDate && project.quoteDate.trim() !== "" && (() => {
          const dateLabel = formatQuoteDate(project.quoteDate!);
          return (
            <p className="text-caption text-text-secondary">
              Date: <span className="font-medium text-text-primary">{dateLabel}</span>
            </p>
          );
        })()}
        {project.notes && (
          <p className="whitespace-pre-line text-body text-text-secondary">{project.notes}</p>
        )}
      </header>

      {items.length === 0 ? (
        <div className="card text-body text-text-secondary">No items have been added to this quote yet.</div>
      ) : (
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item: Item) => (
            <Link
              key={item.id}
              href={`/q/${project.id}/${item.id}`}
              className="card group flex flex-col overflow-hidden transition-all duration-glass ease-glass hover:-translate-y-0.5 hover:shadow-glass-card-hover"
            >
              <div className="relative h-[220px] w-full overflow-hidden rounded-image-container bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {getItemPreviewImage(item) ? (
                  <img
                    src={getItemPreviewImage(item)}
                    alt={item.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-caption text-text-tertiary">No image</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="line-clamp-2 text-subsection-title font-semibold text-text-primary">{item.name}</p>
                <p className="line-clamp-3 text-body text-text-secondary">{item.shortDescription}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      <section className="card mt-4 space-y-3">
        <h2 className="text-subsection-title font-semibold text-text-primary">
          Artwork, Freight &amp; Terms
        </h2>
        <p className="text-caption leading-relaxed text-text-secondary">
          Artwork: This quotation is contingent upon receiving the required artwork and a confirmed
          purchase order. Any logo changes and/or additional artwork modifications may impact the
          production timeline and incur additional costs. If the first pre-production sample
          deviates from the original purchase order, the timeline will be affected, and new dates
          will need to be confirmed. Additionally, creative and design services—including
          artwork/logo development, modifications, design creation, and dye-line adjustments—are
          subject to additional charges.
        </p>
        <p className="text-caption leading-relaxed text-text-secondary">
          Custom pantone/color note: (substrate) Custom Pantone color will be matched as closely as
          possible to the pantone number provided; however, a 100% match cannot always be
          guaranteed due to substrate limitations.
        </p>
        <p className="text-caption leading-relaxed text-text-secondary">
          Freight: Air freight quotes remain valid for 7 days from the date issued and are subject
          to change based on space availability. Freight charges and pricing are subject to
          fluctuations, such as fuel price adjustments. Prices do not include TAX/VAT. Due to the
          fluctuating freight cost all quotes for ocean and air transit will be updated at the time
          your goods are ready, and a sailing/booking is confirmed. Government implemented
          electricity cuts/shutdowns may occur at our overseas factories without notice and may
          cause production delays.
        </p>
        <p className="text-caption leading-relaxed text-text-secondary">
          Please be advised that pricing may vary based on fluctuating tariff rates.
        </p>
        <p className="text-caption leading-relaxed text-text-secondary">
          Timelines to be confirmed upon receipt of PO as CNY can affect timeline/production time.
          Pre-production samples must be developed and approved prior to the order date to ensure
          timely delivery. Quotations are valid for 15 days. Lead times will be confirmed upon
          receipt of sign-off.
        </p>
      </section>
    </div>
  );
}
