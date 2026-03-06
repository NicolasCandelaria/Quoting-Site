"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { getItemPreviewImage } from "@/lib/item-image";
import { exportProjectPdf } from "@/lib/export-pdf";
import { fetchProject, removeItem, updateProject, deleteProject } from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [exporting, setExporting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

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

  const handleExportPdf = async () => {
    if (!project || exporting) return;
    try {
      setExporting(true);
      await exportProjectPdf(project);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate procurement PDF.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete || !project) return;
    try {
      const updated = await removeItem(projectId, itemToDelete.id);
      setProject(updated);
      setItemToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item.");
      setItemToDelete(null);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteProject(project.id);
      setConfirmDeleteProject(false);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project.");
      setConfirmDeleteProject(false);
    }
  };

  if (loading) {
    return <p className="text-body text-text-secondary">Loading project details...</p>;
  }

  if (error) {
    return (
      <div className="rounded-panel border border-status-error/50 bg-status-error/10 px-4 py-3 text-body text-status-error">
        {error}
      </div>
    );
  }

  if (!project) {
    return <p className="text-body text-text-secondary">Project not found.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title font-semibold text-text-primary">
            {project.name}
          </h1>
          <p className="text-body text-text-secondary">
            Client: <span className="font-medium text-text-primary">{project.client}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/q/${project.id}`} className="btn-secondary">
            View Client Link
          </Link>
          <button type="button" className="btn-secondary" onClick={handleCopyLink}>
            {copied ? "Copied" : "Copy Client Link"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleExportPdf()}
            disabled={exporting || project.items.length === 0}
          >
            {exporting ? "Exporting…" : "Export PDF for Procurement"}
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

      <section className="card max-w-xl">
        <h2 className="text-subsection-title font-semibold text-text-primary">Project Details</h2>
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
            {savedNotice && <p className="mt-2 text-caption font-medium text-active-text">{savedNotice}</p>}
          </div>
        </form>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-subsection-title font-semibold text-text-primary">Items</h2>
          <span className="text-caption text-text-secondary">
            {project.items.length} item{project.items.length === 1 ? "" : "s"}
          </span>
        </div>

        {project.items.length === 0 ? (
          <p className="text-body text-text-secondary">
            No items yet. Use <span className="font-semibold text-text-primary">Add Item</span> to start building this quote sheet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {project.items.map((item) => (
              <div key={item.id} className="card group flex flex-col overflow-hidden transition-all duration-glass ease-glass hover:-translate-y-0.5 hover:shadow-glass-card-hover">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/projects/${project.id}/items/${item.id}`)}
                  className="flex flex-1 flex-col text-left"
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-t-panel bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {getItemPreviewImage(item) ? (
                      <img src={getItemPreviewImage(item)} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-caption text-text-tertiary">No image</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-subsection-title font-semibold text-text-primary">{item.name}</p>
                    <p className="line-clamp-2 text-caption text-text-secondary">{item.shortDescription}</p>
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
                  <button type="button" className="text-caption text-text-secondary hover:text-status-error" onClick={() => setItemToDelete(item)}>
                    Remove item
                  </button>
                  <button
                    type="button"
                    className="text-caption font-medium text-accent hover:text-accent-hover"
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

      <section className="card max-w-xl border-status-error/30">
        <h2 className="text-subsection-title font-semibold text-text-primary">Danger zone</h2>
        <p className="mt-1 text-body text-text-secondary">
          Removing this project will delete all items and cannot be undone.
        </p>
        <button
          type="button"
          className="mt-3 text-body font-medium text-status-error hover:underline"
          onClick={() => setConfirmDeleteProject(true)}
        >
          Remove project
        </button>
      </section>

      <ConfirmDialog
        open={itemToDelete !== null}
        title="Remove item"
        message={
          itemToDelete
            ? `Remove "${itemToDelete.name}" from this project? This cannot be undone.`
            : ""
        }
        confirmLabel="Remove item"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleConfirmDeleteItem()}
        onCancel={() => setItemToDelete(null)}
      />

      <ConfirmDialog
        open={confirmDeleteProject}
        title="Remove project"
        message={
          project
            ? `Remove "${project.name}" and all its items? This cannot be undone.`
            : ""
        }
        confirmLabel="Remove project"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleConfirmDeleteProject()}
        onCancel={() => setConfirmDeleteProject(false)}
      />
    </div>
  );
}
