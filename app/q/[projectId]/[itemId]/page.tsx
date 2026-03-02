"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Project, Item, PriceTier } from "@/lib/models";
import { getProject } from "@/lib/storage";

export default function ClientItemPage() {
  const params = useParams<{ projectId: string; itemId: string }>();
  const projectId = params.projectId;
  const itemId = params.itemId;

  const [project, setProject] = useState<Project | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = getProject(projectId);
    if (!data) return;
    setProject(data);
    const found = data.items.find((i) => i.id === itemId) ?? null;
    setItem(found);
  }, [projectId, itemId]);

  const sortedTiers: PriceTier[] = useMemo(() => {
    const tiers = item?.priceTiers ?? [];
    return [...tiers].sort((a, b) => {
      if (a.qty === b.qty) return a.pricePerUnitDDP - b.pricePerUnitDDP;
      return a.qty - b.qty;
    });
  }, [item]);

  if (!project || !item) {
    const maybe = getProject(projectId);
    const found = maybe?.items.find((i) => i.id === itemId);
    if (!maybe || !found) {
      notFound();
    }
    return (
      <p className="text-sm text-zinc-600">
        Loading item details...
      </p>
    );
  }

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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            {project.client}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-xs sm:text-sm"
              onClick={handleCopyLink}
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          {item.name}
        </h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          {item.shortDescription}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          {/* Using plain <img> for simplicity in this offline demo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.imageBase64 ? (
            <img
              src={item.imageBase64}
              alt={item.name}
              className="h-72 w-full object-cover sm:h-80"
            />
          ) : (
            <div className="flex h-72 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 sm:h-80">
              No image provided
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-950">
              Specifications
            </h2>
            <dl className="grid grid-cols-1 gap-2 text-sm text-zinc-800">
              {item.material && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Material</dt>
                  <dd className="text-right">{item.material}</dd>
                </div>
              )}
              {item.size && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Size</dt>
                  <dd className="text-right whitespace-pre-line">
                    {item.size}
                  </dd>
                </div>
              )}
              {item.logo && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Logo</dt>
                  <dd className="text-right whitespace-pre-line">
                    {item.logo}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-950">
              Pre-Production
            </h2>
            <dl className="grid grid-cols-1 gap-2 text-sm text-zinc-800">
              {item.preProductionSampleTime && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Sample Time</dt>
                  <dd className="text-right">
                    {item.preProductionSampleTime}
                  </dd>
                </div>
              )}
              {item.preProductionSampleFee && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Sample Fee</dt>
                  <dd className="text-right">
                    {item.preProductionSampleFee}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {item.packingDetails && (
            <div className="card p-4 space-y-2 text-sm text-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-950">
                Packing Details
              </h2>
              <p className="whitespace-pre-line">{item.packingDetails}</p>
            </div>
          )}
        </section>
      </div>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-950">
            Pricing (Delivered Duty Paid)
          </h2>
          <p className="text-xs text-zinc-500">
            Pricing subject to final quote and availability.
          </p>
        </div>

        {sortedTiers.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No pricing tiers have been configured for this item yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-y-1">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Price / Unit (DDP)</th>
                  <th className="text-left px-3 py-2">
                    Production + Transit Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier, index) => (
                  <tr
                    key={`${tier.qty}-${index}`}
                    className="bg-zinc-50 hover:bg-brand-50"
                  >
                    <td className="px-3 py-3 text-zinc-950">
                      {tier.qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-zinc-950">
                      ${tier.pricePerUnitDDP.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-zinc-800">
                      {tier.productionPlusTransitTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

