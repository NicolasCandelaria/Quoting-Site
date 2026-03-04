"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project, Item } from "@/lib/models";
import { createOrUpdateItem, fetchProject } from "@/lib/api";
import { ItemForm } from "@/components/ItemForm";

export default function NewItemPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [saveError, setSaveError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const data = await fetchProject(projectId);
      setProject(data);
    };

    void load();
  }, [projectId]);

  const handleSubmit = async (item: Item) => {
    setSaveError("");

    try {
      await createOrUpdateItem(projectId, item);
      router.push(`/admin/projects/${projectId}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save this item. Please try again.",
      );
    }

    setSaveError(
      "Could not save this item. Browser storage may be full due to large images. Try fewer/smaller images, then save again.",
    );
  };

  if (!project) {
    return <p className="text-sm text-slate-600">Loading project…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          New Item
        </h1>
        <p className="text-sm text-slate-600">
          Project: <span className="font-medium text-slate-900">{project.name}</span>
        </p>
      </header>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <ItemForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/projects/${projectId}`)}
      />
    </div>
  );
}
