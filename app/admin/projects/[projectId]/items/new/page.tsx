"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { getProject, upsertItem } from "@/lib/storage";
import { ItemForm } from "@/components/ItemForm";

export default function NewItemPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const data = getProject(projectId);
    if (!data) return;
    setProject(data);
  }, [projectId]);

  if (!project) {
    const maybe = getProject(projectId);
    if (!maybe) notFound();
  }

  const handleSubmit = (item: Item) => {
    const updated = upsertItem(projectId, item);
    if (updated) {
      router.push(`/admin/projects/${projectId}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          New Item
        </h1>
        {project && (
          <p className="text-sm text-slate-600">
            Project:{" "}
            <span className="font-medium text-slate-900">
              {project.name}
            </span>
          </p>
        )}
      </header>

      <ItemForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/projects/${projectId}`)}
      />
    </div>
  );
}

