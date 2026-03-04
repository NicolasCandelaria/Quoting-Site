"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { getItemPreviewImage } from "@/lib/item-image";
import { fetchProject, removeItem, updateProject } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProject(projectId);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load project.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [projectId]);

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;

    const formData = new FormData(e.currentTarget);
    const updated: Project = {
      ...project,
      name: String(formData.get("name") || ""),
      client: String(formData.get("client") || ""),
      notes: String(formData.get("notes") || "") || undefined,
    };

    try {
      const saved = await updateProject(updated);
      setProject(saved);
      setSavedNotice("Changes Saved");
      window.setTimeout(() => setSavedNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project.");
    }
  };

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
      const textArea = document.createElement("textarea");
      textArea.value = clientLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    const confirmed = window.confirm(
      `Remove "${item.name}" from this project? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const updated = await removeItem(projectId, item.id);
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading project details...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-slate-600">Project not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {project.name}
          </h1>
          <p className="text-sm text-zinc-600">
            Client: <span className="font-medium text-zinc-950">{project.client}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/q/${project.id}`} className="btn-secondary text-xs sm:text-sm">
            View Client Link
          </Link>
          <button type="button" className="btn-secondary text-xs sm:text-sm" onClick={handleCopyLink}>
            {copied ? "Copied" : "Copy Client Link"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push(`/admin/projects/${project.id}/items/new`)}
          >
            Add Item
          </button>
        </div>
      </header>

      <section className="card max-w-xl p-5">
        <h2 className="text-base font-semibold text-zinc-950">Project Details</h2>
        <form onSubmit={handleUpdate} className="mt-4 space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input name="name" className="input" defaultValue={project.name} required />
          </div>
          <div>
            <label className="label">Client</label>
            <input name="client" className="input" defaultValue={project.client} required />
          </div>
          <div>
            <label className="label">Notes (internal)</label>
            <textarea name="notes" className="input min-h-[96px]" defaultValue={project.notes ?? ""} />
          </div>
          <div className="pt-2">
            <button type="submit" className="btn-primary">Save Changes</button>
            {savedNotice && <p className="mt-2 text-xs font-medium text-brand-700">{savedNotice}</p>}
          </div>
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Items</h2>
          <span className="text-xs text-slate-500">
            {project.items.length} item{project.items.length === 1 ? "" : "s"}
          </span>
        </div>

        {project.items.length === 0 ? (
          <p className="text-sm text-slate-600">
            No items yet. Use <span className="font-semibold text-slate-900">Add Item</span> to start building this quote sheet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {project.items.map((item) => (
              <div key={item.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/projects/${project.id}/items/${item.id}`)}
                  className="flex flex-1 flex-col text-left"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {getItemPreviewImage(item) ? (
                      <img src={getItemPreviewImage(item)} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">No image</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-xs font-semibold text-slate-900">{item.name}</p>
                    <p className="line-clamp-2 text-[11px] text-slate-600">{item.shortDescription}</p>
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                  <button type="button" className="text-[11px] text-slate-500 hover:text-red-500" onClick={() => void handleDeleteItem(item)}>
                    Delete
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                    onClick={() => router.push(`/admin/projects/${project.id}/items/${item.id}`)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
