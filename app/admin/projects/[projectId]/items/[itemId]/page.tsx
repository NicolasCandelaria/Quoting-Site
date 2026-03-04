"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ItemForm } from "@/components/ItemForm";
import { createOrUpdateItem, fetchProject } from "@/lib/api";
import type { Item, Project } from "@/lib/models";

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.projectId ?? "");
  const itemId = String(params.itemId ?? "");

  const [project, setProject] = useState<Project | null>(null);
  const [saveError, setSaveError] = useState<string>("");
  const [initialItem, setInitialItem] = useState<Item | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await fetchProject(projectId);
      if (!data) return;

      setProject(data);
      const foundItem = data.items.find((candidate) => candidate.id === itemId) ?? null;
      setInitialItem(foundItem);
    };

    void load();
  }, [itemId, projectId]);

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

  if (!project || !initialItem) {
    return <p className="text-sm text-slate-600">Loading item details...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit Item
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
        initial={initialItem}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/projects/${projectId}`)}
      />
    </div>
  );
}
