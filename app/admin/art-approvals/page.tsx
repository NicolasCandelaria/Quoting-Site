"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtApprovalStatusBadge } from "@/components/art-approvals/ArtApprovalStatusBadge";
import type { ArtApproval } from "@/lib/art-approvals/models";
import type { Project } from "@/lib/models";
import { createArtApproval, fetchArtApprovals, fetchProjects } from "@/lib/api";

export default function ArtApprovalsPage() {
  const [approvals, setApprovals] = useState<ArtApproval[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [optionalProjectId, setOptionalProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [approvalRows, projectRows] = await Promise.all([
          fetchArtApprovals(),
          fetchProjects(),
        ]);
        setApprovals(approvalRows);
        setProjects(projectRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load art approvals.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) return;

    setSaving(true);
    setError("");
    try {
      const created = await createArtApproval({
        title: title.trim(),
        clientName: clientName.trim(),
        optionalProjectId: optionalProjectId.trim() || undefined,
      });
      setApprovals((prev) => [created, ...prev]);
      setTitle("");
      setClientName("");
      setOptionalProjectId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create art approval.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title font-semibold text-text-primary">Art approvals</h1>
          <p className="mt-1 max-w-xl text-body text-text-secondary">
            Create approval rounds, attach client context, and manage review status before sharing
            artwork with clients.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-panel border border-status-error/50 bg-status-error/10 px-4 py-3 text-body text-status-error">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleCreate(e)} className="card space-y-4">
        <h2 className="text-subsection-title font-semibold text-text-primary">New approval</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-caption font-medium text-text-secondary">
            Title
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring promo sleeve"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-caption font-medium text-text-secondary">
            Client name
            <input
              className="input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-caption font-medium text-text-secondary">
          Project (optional)
          <select
            className="input"
            value={optionalProjectId}
            onChange={(e) => setOptionalProjectId(e.target.value)}
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create approval"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-subsection-title font-semibold text-text-primary">All approvals</h2>
        {loading ? (
          <div className="card text-body text-text-secondary">Loading approvals…</div>
        ) : approvals.length === 0 ? (
          <div className="card">
            <p className="font-medium text-text-primary">No art approvals yet.</p>
            <p className="mt-1 text-body text-text-secondary">
              Use the form above to create your first approval record.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {approvals.map((approval) => (
              <li key={approval.id}>
                <Link
                  href={`/admin/art-approvals/${approval.id}`}
                  className="card flex flex-col gap-2 transition-all duration-glass ease-glass hover:-translate-y-0.5 hover:shadow-glass-card-hover sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-subsection-title font-semibold text-text-primary">
                      {approval.title}
                    </p>
                    <p className="mt-0.5 text-caption text-text-secondary">
                      Client:{" "}
                      <span className="font-medium text-text-primary">{approval.clientName}</span>
                      {approval.optionalProjectId && (
                        <>
                          {" "}
                          · Project ID:{" "}
                          <span className="font-mono text-text-primary">
                            {approval.optionalProjectId}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-caption text-text-secondary">
                      Round {approval.round} · Updated{" "}
                      {new Date(approval.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <ArtApprovalStatusBadge status={approval.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
