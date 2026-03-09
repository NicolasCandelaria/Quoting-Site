"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { getItemPreviewImage } from "@/lib/item-image";
import { fetchProject } from "@/lib/api";
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
          const d = new Date(project.quoteDate!);
          const dateLabel = !Number.isNaN(d.getTime())
            ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
            : project.quoteDate;
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

      <p className="mt-6 text-caption leading-snug text-text-tertiary">
        This quote sheet together with the ideas expressed therein are the
        Confidential and Proprietary work of Billboard Worldwide Promotions Ltd.
        (&quot;Billboard&quot;) and is delivered to the recipient for the sole and
        exclusive purpose of soliciting a PO, job, or contract for work from the
        recipient. Billboard is the sole and exclusive copyright owner of the
        images and/or ideas expressed in the Quote Sheet and the recipient will
        not copy or alter the same, including removing Billboard&apos;s name or
        trademarks or adding the name or trademarks of the recipient or any
        third party and the recipient will not present it as the recipient&apos;s own
        or original work without Billboard&apos;s prior written consent.
      </p>
    </div>
  );
}
