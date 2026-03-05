"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/models";
import { fetchProjects, deleteProject } from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function AdminHomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load projects.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project.");
      setProjectToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Create quote sheet projects for each client engagement, then add
            items with pricing tiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/projects/new" className="btn-primary">
            Create New Project
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-sm text-slate-600">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">No projects yet.</p>
          <p className="mt-1">
            Use{" "}
            <span className="font-semibold text-slate-900">Create New Project</span>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card flex flex-col gap-3 p-4 transition hover:border-brand-100 hover:shadow-lg"
            >
              <Link
                href={`/admin/projects/${project.id}`}
                className="flex flex-1 flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {project.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Client:{" "}
                      <span className="font-medium text-slate-800">
                        {project.client}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {project.items.length} item{project.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {project.notes && (
                  <p className="line-clamp-3 whitespace-pre-line text-xs text-slate-600">
                    {project.notes}
                  </p>
                )}
              </Link>
              <div className="flex justify-end border-t border-slate-100 pt-2 mt-1">
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setProjectToDelete(project);
                  }}
                >
                  Remove project
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={projectToDelete !== null}
        title="Remove project"
        message={
          projectToDelete
            ? `Remove "${projectToDelete.name}" and all its items? This cannot be undone.`
            : ""
        }
        confirmLabel="Remove project"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleConfirmDeleteProject()}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
