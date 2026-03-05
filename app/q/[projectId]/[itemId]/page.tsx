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

  if (!project || !item) {
    return <p className="text-sm text-zinc-600">Loading item details...</p>;
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
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{project.client}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs sm:text-sm" onClick={handleCopyLink}>
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs sm:text-sm"
              onClick={() => void handleDownloadPdf()}
              disabled={exporting || (project?.items.length ?? 0) === 0}
            >
              {exporting ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{item.name}</h1>
        <p className="max-w-2xl text-sm text-zinc-600">{item.shortDescription}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card space-y-3 overflow-hidden p-3">
          {itemImages.length > 0 ? (
            <div className="relative">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100">
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
                    <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      {normalizedImageIndex + 1} / {itemImages.length}
                    </span>
                  </>
                )}
              </div>
              {itemImages.length > 1 && (
                <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-1.5">
                  {itemImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      className={`overflow-hidden rounded border-2 transition ${
                        index === normalizedImageIndex
                          ? "border-brand-500 ring-1 ring-brand-200"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-12 w-12 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500">
              No image provided
            </div>
          )}

          <p className="text-[11px] text-zinc-500">
            For visual representation purposes only. May not be exactly as
            shown.
          </p>
        </section>

        <section className="space-y-4">
          <div className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-zinc-950">Specifications</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm text-zinc-800">
              {item.material && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Material</dt><dd className="text-right">{item.material}</dd></div>}
              {item.size && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Size</dt><dd className="whitespace-pre-line text-right">{item.size}</dd></div>}
              {item.logo && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Logo</dt><dd className="whitespace-pre-line text-right">{item.logo}</dd></div>}
            </dl>
          </div>

          <div className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-zinc-950">Pre-Production</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm text-zinc-800">
              {item.preProductionSampleTime && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Sample Time</dt><dd className="text-right">{item.preProductionSampleTime}</dd></div>}
              {item.preProductionSampleFee && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Sample Fee</dt><dd className="text-right">{item.preProductionSampleFee}</dd></div>}
            </dl>
          </div>

          {item.packingDetails && (
            <div className="card space-y-2 p-4 text-sm text-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-950">Packing Details</h2>
              <p className="whitespace-pre-line">{item.packingDetails}</p>
            </div>
          )}
        </section>
      </div>

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-950">Pricing (Delivered Duty Paid)</h2>
          <p className="text-xs text-zinc-500">Pricing subject to final quote and availability.</p>
        </div>

        {sortedTiers.length === 0 ? (
          <p className="text-sm text-zinc-600">No pricing tiers have been configured for this item yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Price / Unit (DDP)</th>
                  <th className="px-3 py-2 text-left">Production + Transit Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier, index) => (
                  <tr key={`${tier.qty}-${index}`} className="bg-zinc-50 hover:bg-brand-50">
                    <td className="px-3 py-3 text-zinc-950">{tier.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 font-semibold text-zinc-950">${tier.pricePerUnitDDP.toFixed(2)}</td>
                    <td className="px-3 py-3 text-zinc-800">{tier.productionPlusTransitTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] leading-snug text-zinc-500">
        This quote sheet together with the ideas expressed therein are the
        Confidential and Proprietary work of Billboard Worldwide Promotions Ltd.
        (“Billboard”) and is delivered to the recipient for the sole and
        exclusive purpose of soliciting a PO, job, or contract for work from the
        recipient. Billboard is the sole and exclusive copyright owner of the
        images and/or ideas expressed in the Quote Sheet and the recipient will
        not copy or alter the same, including removing Billboard’s name or
        trademarks or adding the name or trademarks of the recipient or any
        third party and the recipient will not present it as the recipient’s own
        or original work without Billboard’s prior written consent.
      </p>
    </div>
  );
}
