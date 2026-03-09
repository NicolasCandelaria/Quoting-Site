"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, Item, PriceTier } from "@/lib/models";
import { fetchProject } from "@/lib/api";
import { getItemPreviewImage } from "@/lib/item-image";
import { exportProjectPdf } from "@/lib/export-pdf";

export default function ClientItemPage() {
  const params = useParams<{ projectId: string; itemId: string }>();
  const projectId = params.projectId;
  const itemId = params.itemId;

  const [project, setProject] = useState<Project | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const data = await fetchProject(projectId);
      if (!data) return;
      setProject(data);
      const found = data.items.find((i) => i.id === itemId) ?? null;
      setItem(found);
    };

    void load();
  }, [projectId, itemId]);

  useEffect(() => {
    if (!item) return;
    setActiveImageIndex(item.previewImageIndex ?? 0);
  }, [item]);

  const imageCount = useMemo(() => {
    if (!item) return 0;
    if (item.images.length > 0) return item.images.length;
    return getItemPreviewImage(item) ? 1 : 0;
  }, [item]);

  const goPrev = useCallback(() => {
    setActiveImageIndex((prev) =>
      imageCount <= 1 ? 0 : prev <= 0 ? imageCount - 1 : prev - 1,
    );
  }, [imageCount]);
  const goNext = useCallback(() => {
    setActiveImageIndex((prev) =>
      imageCount <= 1 ? 0 : prev >= imageCount - 1 ? 0 : prev + 1,
    );
  }, [imageCount]);

  useEffect(() => {
    if (imageCount <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageCount, goPrev, goNext]);

  const sortedTiers: PriceTier[] = useMemo(() => {
    const tiers = item?.priceTiers ?? [];
    return [...tiers].sort((a, b) => {
      if (a.qty === b.qty) return a.pricePerUnitDDP - b.pricePerUnitDDP;
      return a.qty - b.qty;
    });
  }, [item]);

  const pricingBasisLabel =
    project?.pricingBasis === "FOB" ? "FOB" : "DDP";

  if (!project || !item) {
    return <p className="text-body text-text-secondary">Loading item details...</p>;
  }

  const itemImages = item.images.length > 0
    ? item.images
    : getItemPreviewImage(item)
      ? [getItemPreviewImage(item)]
      : [];

  const normalizedImageIndex =
    activeImageIndex >= 0 && activeImageIndex < itemImages.length
      ? activeImageIndex
      : Math.min(item.previewImageIndex ?? 0, Math.max(itemImages.length - 1, 0));

  const clientLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${projectId}/${itemId}`
      : `/q/${projectId}/${itemId}`;

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
          <p className="text-caption uppercase tracking-[0.2em] text-text-tertiary">{project.client}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={handleCopyLink}>
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleDownloadPdf()}
              disabled={exporting || (project?.items.length ?? 0) === 0}
            >
              {exporting ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>
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
        <h1 className="text-page-title font-semibold text-text-primary">{item.name}</h1>
        <p className="max-w-2xl text-body text-text-secondary">{item.shortDescription}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card space-y-3 overflow-hidden">
          {itemImages.length > 0 ? (
            <div className="relative">
              <div className="relative h-[420px] w-full overflow-hidden rounded-panel bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={itemImages[normalizedImageIndex]}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
                {itemImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                      aria-label="Previous image"
                    >
                      <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                      aria-label="Next image"
                    >
                      <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-caption text-white">
                      {normalizedImageIndex + 1} / {itemImages.length}
                    </span>
                  </>
                )}
              </div>
              {itemImages.length > 1 && (
                <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-2">
                  {itemImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      className={`overflow-hidden rounded-button border-2 transition-colors ${
                        index === normalizedImageIndex
                          ? "border-accent"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-16 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[420px] w-full items-center justify-center rounded-panel bg-slate-100 text-body text-text-tertiary">
              No image provided
            </div>
          )}

          <p className="text-caption text-text-tertiary">
            For visual representation purposes only. May not be exactly as
            shown.
          </p>
        </section>

        <section className="space-y-4">
          <div className="card space-y-3">
            <h2 className="text-subsection-title font-semibold text-text-primary">Specifications</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {item.material && (<><dt className="text-spec-label text-text-secondary">Material</dt><dd className="text-spec-value font-medium text-text-primary">{item.material}</dd></>)}
              {item.size && (<><dt className="text-spec-label text-text-secondary">Size</dt><dd className="whitespace-pre-line text-spec-value font-medium text-text-primary">{item.size}</dd></>)}
              {item.logo && (<><dt className="text-spec-label text-text-secondary">Logo</dt><dd className="whitespace-pre-line text-spec-value font-medium text-text-primary">{item.logo}</dd></>)}
            </dl>
          </div>

          <div className="card space-y-3">
            <h2 className="text-subsection-title font-semibold text-text-primary">Pre-Production</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {item.preProductionSampleTime && (<><dt className="text-spec-label text-text-secondary">Sample Time</dt><dd className="text-spec-value font-medium text-text-primary">{item.preProductionSampleTime}</dd></>)}
              {item.preProductionSampleFee && (<><dt className="text-spec-label text-text-secondary">Sample Fee</dt><dd className="text-spec-value font-medium text-text-primary">{item.preProductionSampleFee}</dd></>)}
            </dl>
          </div>

          {item.packingDetails && (
            <div className="card space-y-2">
              <h2 className="text-subsection-title font-semibold text-text-primary">Packing Details</h2>
              <p className="whitespace-pre-line text-body text-text-primary">{item.packingDetails}</p>
            </div>
          )}
        </section>
      </div>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-section-title font-semibold text-text-primary">
            {pricingBasisLabel === "FOB" ? "Pricing (FOB)" : "Pricing (DDP)"}
          </h2>
          <p className="text-caption text-text-secondary">Pricing subject to final quote and availability.</p>
        </div>

        {sortedTiers.length === 0 ? (
          <p className="text-body text-text-secondary">No pricing tiers have been configured for this item yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-panel border border-slate-200 overflow-hidden">
            <table className="min-w-full text-body">
              <thead>
                <tr className="text-spec-label font-semibold text-text-secondary bg-slate-100">
                  <th className="px-3 py-3 text-center">Qty</th>
                  <th className="px-3 py-3 text-right">
                    Price / Unit ({pricingBasisLabel})
                  </th>
                  <th className="px-3 py-3 text-left">Production + Transit Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier, index) => (
                  <tr key={`${tier.qty}-${index}`} className="h-11 border-t border-slate-200 transition-colors hover:bg-slate-50">
                    <td className="px-3 py-3 text-center text-text-primary">{tier.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-medium text-text-primary">${tier.pricePerUnitDDP.toFixed(2)}</td>
                    <td className="px-3 py-3 text-left text-text-primary">{tier.productionPlusTransitTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Legal copy is shown on the internal project page and final PDF, not on the client item view. */}
    </div>
  );
}
