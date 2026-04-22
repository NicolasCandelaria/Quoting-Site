"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { ReviewDecisionForm } from "@/components/art-approvals/ReviewDecisionForm";
import {
  fetchArtApprovalReviewContext,
  requestArtApprovalOtp,
  verifyArtApprovalOtp,
} from "@/lib/art-approvals/api";
import type {
  ArtApproval,
  ArtApprovalDecision,
  ArtApprovalReviewContextResponse,
} from "@/lib/art-approvals/models";

type Stage = "email" | "otp" | "review";

export default function ClientArtReviewPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewContext, setReviewContext] = useState<ArtApprovalReviewContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [completed, setCompleted] = useState<{
    approval: ArtApproval;
    decision: ArtApprovalDecision;
  } | null>(null);

  useEffect(() => {
    if (stage !== "review" || !token) return;
    let cancelled = false;
    setError("");
    setContextLoading(true);
    setReviewContext(null);
    void (async () => {
      try {
        const ctx = await fetchArtApprovalReviewContext(token);
        if (!cancelled) setReviewContext(ctx);
      } catch (err) {
        if (!cancelled) {
          setReviewContext(null);
          setError(
            err instanceof Error ? err.message : "Could not load review materials.",
          );
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, token]);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await requestArtApprovalOtp(token, email);
      setStage("otp");
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyArtApprovalOtp(token, email, otpCode.trim());
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecisionSuccess = (result: { approval: ArtApproval; decision: ArtApprovalDecision }) => {
    setCompleted(result);
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-10">
        <div className="card">
          <p className="text-body text-text-secondary">Invalid review link.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10">
      <div className="card">
        <h1 className="text-section-title font-semibold text-text-primary">Art approval review</h1>
        <p className="mt-2 text-body text-text-secondary">
          Verify your email, then review the materials and record your decision.
        </p>

        {completed ? (
          <div className="mt-6 space-y-3">
            <p className="text-body font-medium text-text-primary">Thank you.</p>
            <p className="text-body text-text-secondary">
              Your decision ({completed.decision.decisionType === "approved" ? "Approved" : "Changes requested"}) has been recorded.
            </p>
            <Link href="/" className="btn-secondary inline-flex">
              Back to home
            </Link>
          </div>
        ) : stage === "email" ? (
          <form onSubmit={(e) => void handleRequestOtp(e)} className="mt-6 space-y-4">
            {error ? (
              <p className="text-body text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <label className="label" htmlFor="review-email">
                Work email
              </label>
              <input
                id="review-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send verification code"}
            </button>
          </form>
        ) : stage === "otp" ? (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="mt-6 space-y-4">
            {error ? (
              <p className="text-body text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <p className="text-body text-text-secondary">
              Enter the 6-digit code sent to <span className="font-medium">{email}</span>.
            </p>
            <div>
              <label className="label" htmlFor="review-otp">
                Verification code
              </label>
              <input
                id="review-otp"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="input tracking-widest"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={busy}
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => {
                  setStage("email");
                  setError("");
                }}
              >
                Use a different email
              </button>
            </div>
          </form>
        ) : contextLoading ? (
          <p className="mt-6 text-body text-text-secondary">Loading review…</p>
        ) : error && stage === "review" ? (
          <div className="mt-6 space-y-3">
            <p className="text-body text-red-600" role="alert">
              {error}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStage("otp");
                setError("");
              }}
            >
              Back to verification
            </button>
          </div>
        ) : reviewContext ? (
          <div className="mt-6">
            <div className="rounded-button border border-black/10 bg-white/60 p-4">
              <p className="text-body text-text-secondary">Client</p>
              <p className="text-body font-medium text-text-primary">{reviewContext.approval.clientName}</p>
              <p className="mt-3 text-body text-text-secondary">Title</p>
              <p className="text-body font-medium text-text-primary">{reviewContext.approval.title}</p>
              <p className="mt-3 text-body text-text-secondary">
                Round <span className="font-medium text-text-primary">{reviewContext.approval.round}</span>
              </p>
            </div>

            {reviewContext.approval.files.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-subsection-title font-semibold text-text-primary">Files</h2>
                <ul className="mt-2 space-y-2">
                  {reviewContext.approval.files.map((f) => (
                    <li key={f.id} className="text-body text-text-primary">
                      {f.downloadUrl ? (
                        <a
                          href={f.downloadUrl}
                          className="underline decoration-from-font hover:text-[#24186e]"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {f.originalName}
                        </a>
                      ) : (
                        <span>{f.originalName}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-6 text-body text-text-secondary">No files attached to this round.</p>
            )}

            {error ? (
              <p className="mt-4 text-body text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <ReviewDecisionForm
              token={token}
              approval={reviewContext.approval}
              onSuccess={handleDecisionSuccess}
            />
          </div>
        ) : (
          <p className="mt-6 text-body text-text-secondary">Unable to load this review.</p>
        )}
      </div>
    </main>
  );
}
