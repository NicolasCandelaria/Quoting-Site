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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          New Project
        </h1>
        <p className="text-sm text-slate-600">
          Capture basic project details for this quote sheet.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card max-w-xl space-y-4 p-6">
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
          <label className="label">Notes (internal)</label>
          <textarea
            className="input min-h-[96px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-700">{error}</p>
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
