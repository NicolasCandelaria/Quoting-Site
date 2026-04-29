"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AllowlistEditor } from "@/components/art-approvals/AllowlistEditor";
import { ArtApprovalForm, type ArtApprovalFormValues } from "@/components/art-approvals/ArtApprovalForm";
import { ArtApprovalStatusBadge } from "@/components/art-approvals/ArtApprovalStatusBadge";
import {
  deleteArtApproval,
  fetchArtApproval,
  markArtApprovalReadyForClient,
  updateArtApproval,
  updateArtApprovalAllowlist,
  uploadArtApprovalFile,
} from "@/lib/art-approvals/api";
import type { ArtApprovalDetail, ArtApprovalDecisionType } from "@/lib/art-approvals/models";
import { fetchProjects } from "@/lib/api";
import type { Project } from "@/lib/models";

function decisionLabel(type: ArtApprovalDecisionType): string {
  return type === "approved" ? "Approved" : "Changes requested";
}

function emptyForm(approval: ArtApprovalDetail): ArtApprovalFormValues {
  return {
    title: approval.title,
    clientName: approval.clientName,
    notes: approval.notes ?? "",
    optionalProjectId: approval.optionalProjectId ?? "",
    optionalItemId: approval.optionalItemId ?? "",
  };
}

export default function ArtApprovalDetailPage() {
  const params = useParams<{ approvalId: string }>();
  const router = useRouter();
  const approvalId = params.approvalId;
  const reviewTokenStorageKey = `art-approval-review-token:${approvalId}`;

  const [approval, setApproval] = useState<ArtApprovalDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formValues, setFormValues] = useState<ArtApprovalFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [allowlistSaving, setAllowlistSaving] = useState(false);
  const [readySaving, setReadySaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastReviewToken, setLastReviewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    const row = await fetchArtApproval(approvalId);
    setApproval(row);
    if (row) {
      setFormValues(emptyForm(row));
    } else {
      setFormValues(null);
    }
    return row;
  }, [approvalId]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(reviewTokenStorageKey);
    if (savedToken) {
      setLastReviewToken(savedToken);
    }
  }, [reviewTokenStorageKey]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [row, projectRows] = await Promise.all([
          fetchArtApproval(approvalId),
          fetchProjects(),
        ]);
        setApproval(row);
        if (row) setFormValues(emptyForm(row));
        else setFormValues(null);
        setProjects(projectRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load art approval.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [approvalId]);

  useEffect(() => {
    if (lastReviewToken) {
      window.localStorage.setItem(reviewTokenStorageKey, lastReviewToken);
    }
  }, [lastReviewToken, reviewTokenStorageKey]);

  const readOnly = approval?.status === "approved";

  const allowlistedEmailStrings = useMemo(
    () => approval?.allowlistedEmails.map((r) => r.email) ?? [],
    [approval],
  );

  const reviewUrl =
    typeof window !== "undefined" && lastReviewToken
      ? `${window.location.origin}/review/${lastReviewToken}`
      : lastReviewToken
        ? `/review/${lastReviewToken}`
        : "";

  const handleCopyReviewLink = async () => {
    if (!reviewUrl) return;
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = reviewUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMetadataSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formValues || readOnly) return;
    setMetadataSaving(true);
    setError("");
    try {
      const optionalProjectId = formValues.optionalProjectId.trim();
      const optionalItemId = formValues.optionalItemId.trim();
      const updated = await updateArtApproval(approvalId, {
        title: formValues.title.trim(),
        clientName: formValues.clientName.trim(),
        notes: formValues.notes.trim() || undefined,
        ...(optionalProjectId
          ? { optionalProjectId }
          : { optionalProjectId: null as unknown as string }),
        ...(optionalItemId
          ? { optionalItemId }
          : { optionalItemId: null as unknown as string }),
      });
      setApproval(updated);
      setFormValues(emptyForm(updated));
      setSavedNotice("Metadata saved");
      window.setTimeout(() => setSavedNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save metadata.");
    } finally {
      setMetadataSaving(false);
    }
  };

  const handleSaveAllowlist = async (emails: string[]) => {
    setAllowlistSaving(true);
    setError("");
    try {
      const updated = await updateArtApprovalAllowlist(approvalId, emails);
      setApproval(updated);
      setSavedNotice("Allowlist updated");
      window.setTimeout(() => setSavedNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save allowlist.");
    } finally {
      setAllowlistSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setReadySaving(true);
    setError("");
    try {
      const { approval: next, reviewToken } = await markArtApprovalReadyForClient(approvalId);
      setApproval(next);
      setFormValues(emptyForm(next));
      setLastReviewToken(reviewToken);
      setSavedNotice("Marked ready for client");
      window.setTimeout(() => setSavedNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark ready for client.");
    } finally {
      setReadySaving(false);
    }
  };

  const handleDeleteApproval = async () => {
    const confirmed = window.confirm(
      "Delete this art approval permanently? This cannot be undone.",
    );
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await deleteArtApproval(approvalId);
      window.localStorage.removeItem(reviewTokenStorageKey);
      router.push("/admin/art-approvals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete art approval.");
      setDeleting(false);
    }
  };

  const handleUploadFiles = async (list: FileList | null) => {
    if (!list?.length || readOnly) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(list)) {
        await uploadArtApprovalFile(approvalId, file);
      }
      await reload();
      setSavedNotice("Files uploaded");
      window.setTimeout(() => setSavedNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const canMarkReady =
    approval &&
    (approval.status === "draft" || approval.status === "with_designer") &&
    allowlistedEmailStrings.length > 0;

  const decisionsTimeline = useMemo(() => {
    if (!approval?.decisions?.length) return [];
    return [...approval.decisions].sort(
      (a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime(),
    );
  }, [approval]);

  if (loading) {
    return <p className="text-body text-text-secondary">Loading art approval…</p>;
  }

  if (error && !approval) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-panel border border-status-error/50 bg-status-error/10 px-4 py-3 text-body text-status-error">
          {error}
        </div>
        <Link href="/admin/art-approvals" className="btn-secondary w-fit">
          Back to art approvals
        </Link>
      </div>
    );
  }

  if (!approval || !formValues) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-text-secondary">Art approval not found.</p>
        <Link href="/admin/art-approvals" className="btn-secondary w-fit">
          Back to art approvals
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-caption text-text-secondary">
            <Link href="/admin/art-approvals" className="font-medium text-accent hover:text-accent-hover">
              Art approvals
            </Link>
            <span className="text-text-tertiary"> / </span>
            <span className="font-mono text-text-primary">{approval.id}</span>
          </p>
          <h1 className="mt-2 text-page-title font-semibold text-text-primary">{approval.title}</h1>
          <p className="mt-1 text-body text-text-secondary">
            Client: <span className="font-medium text-text-primary">{approval.clientName}</span>
          </p>
          <p className="mt-1 text-caption text-text-secondary">
            Round {approval.round} · Updated {new Date(approval.updatedAt).toLocaleString()}
            {approval.createdBy && (
              <>
                {" "}
                · Created by{" "}
                <span className="font-medium text-text-primary">{approval.createdBy}</span>
              </>
            )}
          </p>
          {approval.optionalProjectId && (
            <p className="mt-1 text-caption">
              <span className="text-text-secondary">Project: </span>
              <Link
                href={`/admin/projects/${approval.optionalProjectId}`}
                className="font-medium text-accent hover:text-accent-hover"
              >
                Open project
              </Link>
            </p>
          )}
        </div>
        <ArtApprovalStatusBadge status={approval.status} />
      </header>

      {error && (
        <div className="rounded-panel border border-status-error/50 bg-status-error/10 px-4 py-3 text-body text-status-error">
          {error}
        </div>
      )}

      {savedNotice && (
        <p className="text-caption font-medium text-active-text">{savedNotice}</p>
      )}

      <section className="card max-w-2xl">
        <h2 className="text-subsection-title font-semibold text-text-primary">Metadata</h2>
        <ArtApprovalForm
          values={formValues}
          projects={projects}
          disabled={readOnly}
          saving={metadataSaving}
          onValuesChange={(patch) => setFormValues((prev) => (prev ? { ...prev, ...patch } : prev))}
          onSubmit={handleMetadataSubmit}
        />
      </section>

      <section className="card max-w-2xl">
        <h2 className="text-subsection-title font-semibold text-text-primary">Client allowlist</h2>
        <div className="mt-4">
          <AllowlistEditor
            emails={allowlistedEmailStrings}
            disabled={readOnly}
            saving={allowlistSaving}
            onSave={handleSaveAllowlist}
          />
        </div>
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-body font-semibold text-text-primary">Ready for client</h3>
          <p className="mt-1 text-body text-text-secondary">
            Generates a private review link and moves this record to{" "}
            <span className="font-medium text-text-primary">Ready for client</span>. At least one
            allowlisted email is required.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={() => void handleMarkReady()}
            disabled={!canMarkReady || readOnly || readySaving}
          >
            {readySaving ? "Working…" : "Mark ready for client"}
          </button>
          {!canMarkReady && !readOnly && approval.status !== "ready_for_client" && (
            <p className="mt-2 text-caption text-text-secondary">
              Add and save at least one allowlisted email to enable this action.
            </p>
          )}
        </div>
      </section>

      {lastReviewToken && reviewUrl && (
        <section className="card max-w-2xl border-amber-200 bg-amber-50/40">
          <h2 className="text-subsection-title font-semibold text-text-primary">Client review link</h2>
          <p className="mt-3 break-all rounded-panel border border-slate-200 bg-white px-3 py-2 font-mono text-caption text-text-primary">
            {reviewUrl}
          </p>
          <button type="button" className="btn-secondary mt-3" onClick={() => void handleCopyReviewLink()}>
            {copied ? "Copied" : "Copy client review link"}
          </button>
        </section>
      )}

      <section className="card max-w-2xl">
        <h2 className="text-subsection-title font-semibold text-text-primary">Artwork files</h2>
        <p className="mt-1 text-body text-text-secondary">
          Upload files for reviewers (max 25MB per file). {readOnly ? "This approval is read-only." : ""}
        </p>
        {!readOnly && (
          <div className="mt-3">
            <input
              type="file"
              multiple
              className="text-caption file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-medium file:text-text-primary hover:file:bg-slate-200"
              disabled={uploading}
              onChange={(e) => void handleUploadFiles(e.target.files)}
            />
            {uploading && <p className="mt-2 text-caption text-text-secondary">Uploading…</p>}
          </div>
        )}
        {approval.files.length === 0 ? (
          <p className="mt-4 text-body text-text-secondary">No files uploaded yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {approval.files.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-panel border border-slate-200 px-3 py-2"
              >
                <span className="font-medium text-text-primary">{f.originalName}</span>
                <span className="text-caption text-text-secondary">
                  {(f.sizeBytes / 1024).toFixed(1)} KB · {new Date(f.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card max-w-2xl">
        <h2 className="text-subsection-title font-semibold text-text-primary">Client decisions</h2>
        {decisionsTimeline.length === 0 ? (
          <p className="mt-2 text-body text-text-secondary">No client decisions recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
            {decisionsTimeline.map((d) => (
              <li key={d.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="text-body font-medium text-text-primary">{decisionLabel(d.decisionType)}</p>
                <p className="text-caption text-text-secondary">
                  Round {d.round} · {new Date(d.decidedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  {d.verifiedEmail} · Signed as{" "}
                  <span className="font-medium text-text-primary">{d.typedFullName}</span>
                </p>
                {d.comment && (
                  <p className="mt-2 rounded-panel bg-slate-50 px-3 py-2 text-body text-text-primary">
                    {d.comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card max-w-2xl border-status-error/30">
        <h2 className="text-subsection-title font-semibold text-text-primary">Danger zone</h2>
        <p className="mt-1 text-body text-text-secondary">
          Permanently remove this art approval and all related allowlist entries, files, OTP
          challenges, and client decisions.
        </p>
        <button
          type="button"
          className="mt-3 text-body font-medium text-status-error hover:underline"
          disabled={deleting}
          onClick={() => void handleDeleteApproval()}
        >
          {deleting ? "Deleting…" : "Delete art approval"}
        </button>
      </section>
    </div>
  );
}
