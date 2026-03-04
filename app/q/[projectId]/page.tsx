"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { fetchProject } from "@/lib/api";

export default function ClientProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);
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
    return <p className="text-sm text-zinc-600">Loading quote sheet...</p>;
  }

  if (!project) {
    return <p className="text-sm text-zinc-600">Quote sheet not found.</p>;
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Quote Sheet</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs sm:text-sm" onClick={handleCopyLink}>
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{project.name}</h1>
        <p className="text-sm text-zinc-600">
          Prepared for <span className="font-medium text-zinc-950">{project.client}</span>
        </p>
        {project.notes && (
          <p className="whitespace-pre-line text-sm text-zinc-600">{project.notes}</p>
        )}
      </header>

      {items.length === 0 ? (
        <div className="card p-6 text-sm text-zinc-600">No items have been added to this quote yet.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item: Item) => (
            <Link
              key={item.id}
              href={`/q/${project.id}/${item.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card transition hover:shadow-lg"
            >
              <div className="relative h-40 w-full overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.imageBase64 ? (
                  <img src={item.imageBase64} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-zinc-950">{item.name}</p>
                <p className="line-clamp-3 text-xs text-zinc-600">{item.shortDescription}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
