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
      const message =
        error instanceof Error
          ? error.message
          : "Could not save this item. Please try again.";

      if (message.includes("Browser storage may be full")) {
        setSaveError(
          "Save failed on the deployed server. This message comes from an older build path. Redeploy the latest branch and rerun the Supabase schema migration.",
        );
        return;
      }

      setSaveError(message);
    }
  };

  if (!project) {
    return <p className="text-body text-text-secondary">Loading project…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold text-text-primary">
          New Item
        </h1>
        <p className="text-body text-text-secondary">
          Project: <span className="font-medium text-text-primary">{project.name}</span>
        </p>
      </header>

      {saveError && (
        <div className="rounded-panel border border-status-error/50 bg-status-error/10 px-4 py-3 text-body text-status-error">
          {saveError}
        </div>
      )}

      <ItemForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/projects/${projectId}`)}
        projectName={project.name}
      />
    </div>
  );
}
