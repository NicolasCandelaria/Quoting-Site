"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createProject } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const project = await createProject({
        name,
        client,
        notes: notes || undefined,
      });
      router.push(`/admin/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold text-text-primary">
          New Project
        </h1>
        <p className="text-body text-text-secondary">
          Capture basic project details for this quote sheet.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card max-w-xl space-y-4">
        <div>
          <label className="label">Project Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Client</label>
          <input
            className="input"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Brief Description</label>
          <textarea
            className="input min-h-[96px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-body text-status-error">{error}</p>
        )}

        <div className="pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create & Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
