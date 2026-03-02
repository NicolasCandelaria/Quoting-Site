"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/models";
import { getProjects } from "@/lib/storage";
import { seedDemoProject } from "@/lib/seed";

export default function AdminHomePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const handleSeed = () => {
    const seeded = seedDemoProject();
    setProjects((prev) => {
      const existing = prev.find((p) => p.id === seeded.id);
      if (existing) return prev;
      return [...prev, seeded];
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-xl">
            Create quote sheet projects for each client engagement, then add
            items with pricing tiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-xs sm:text-sm"
            onClick={handleSeed}
          >
            Seed Demo Project
          </button>
          <Link href="/admin/projects/new" className="btn-primary">
            Create New Project
          </Link>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">No projects yet.</p>
          <p className="mt-1">
            Use{" "}
            <span className="font-semibold text-slate-900">
              Create New Project
            </span>{" "}
            above, or seed a demo project to see how client pages look.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="card p-4 flex flex-col gap-3 hover:shadow-lg hover:border-brand-100 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {project.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Client:{" "}
                    <span className="font-medium text-slate-800">
                      {project.client}
                    </span>
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {project.items.length} item
                  {project.items.length === 1 ? "" : "s"}
                </span>
              </div>
              {project.notes && (
                <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-line">
                  {project.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

