"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createProject } from "@/lib/storage";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const project = createProject({ name, client, notes: notes || undefined });
    router.push(`/admin/projects/${project.id}`);
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

      <form
        onSubmit={handleSubmit}
        className="card p-6 space-y-4 max-w-xl"
      >
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

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Create &amp; Continue
          </button>
        </div>
      </form>
    </div>
  );
}

