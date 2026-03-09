"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createProject } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [pricingBasis, setPricingBasis] = useState<"DDP" | "FOB">("DDP");
  const [quoteDate, setQuoteDate] = useState("");
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
        contactName: contactName || undefined,
        pricingBasis,
        quoteDate: quoteDate || undefined,
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
          <label className="label">Quote date</label>
          <input
            type="date"
            className="input"
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Billboard Worldwide contact</label>
          <input
            className="input"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Name of primary Billboard contact"
          />
        </div>
        <div>
          <label className="label">Pricing basis</label>
          <select
            className="input h-10"
            value={pricingBasis}
            onChange={(e) =>
              setPricingBasis(e.target.value === "FOB" ? "FOB" : "DDP")
            }
          >
            <option value="DDP">Delivered Duty Paid (DDP)</option>
            <option value="FOB">FOB</option>
          </select>
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
