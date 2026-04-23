"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { submitArtApprovalDecision } from "@/lib/art-approvals/api";
import type {
  ArtApproval,
  ArtApprovalDecision,
  ArtApprovalDecisionType,
  ArtApprovalReviewContextApproval,
} from "@/lib/art-approvals/models";

type Props = {
  token: string;
  approval: ArtApprovalReviewContextApproval;
  onSuccess: (result: { approval: ArtApproval; decision: ArtApprovalDecision }) => void;
};

export function ReviewDecisionForm({ token, approval, onSuccess }: Props) {
  const [decisionType, setDecisionType] = useState<ArtApprovalDecisionType>("approved");
  const [comment, setComment] = useState("");
  const [typedFullName, setTypedFullName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const terminal =
    approval.status === "approved" || approval.status === "changes_requested";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (terminal) return;
    if (!confirmed) {
      setError("Please confirm your decision.");
      return;
    }
    if (!typedFullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (decisionType === "changes_requested" && !comment.trim()) {
      setError("A comment is required when requesting changes.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitArtApprovalDecision(token, {
        decisionType,
        typedFullName: typedFullName.trim(),
        comment: decisionType === "changes_requested" ? comment.trim() : undefined,
        confirmed: true,
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (terminal) {
    return (
      <p className="text-body text-text-secondary">
        This review round is already completed.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
      {error ? (
        <p className="text-body text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <label className="label" htmlFor="review-decision-type">
          Decision
        </label>
        <select
          id="review-decision-type"
          className="input h-10"
          value={decisionType}
          onChange={(e) => setDecisionType(e.target.value as ArtApprovalDecisionType)}
          disabled={submitting}
        >
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes requested</option>
        </select>
      </div>

      {decisionType === "changes_requested" ? (
        <div>
          <label className="label" htmlFor="review-decision-comment">
            Comment
          </label>
          <textarea
            id="review-decision-comment"
            className="input min-h-[120px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            disabled={submitting}
            placeholder="Describe the changes you need."
          />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="review-decision-name">
          Full name (typed signature)
        </label>
        <input
          id="review-decision-name"
          className="input"
          value={typedFullName}
          onChange={(e) => setTypedFullName(e.target.value)}
          required
          disabled={submitting}
          autoComplete="name"
        />
      </div>

      <label className="flex items-start gap-2 text-body text-text-primary">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border border-black/20"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={submitting}
          required
        />
        <span>I confirm this decision is accurate and submitted on behalf of the client.</span>
      </label>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit decision"}
      </button>
    </form>
  );
}
