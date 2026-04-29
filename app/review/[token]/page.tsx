"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useRef, useState } from "react";

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

const MAGIC_LINK_ERROR_MESSAGES: Record<string, string> = {
  magic_invalid:
    "This sign-in link is invalid or does not match this review. Request a new link from the page below.",
  magic_expired:
    "This sign-in link has expired. Enter your email again to receive a new link or code.",
  magic_used:
    "This sign-in link was already used. Request a new link if you need to sign in again.",
  magic_attempts:
    "Too many incorrect code attempts. Request a new sign-in link or code from the page below.",
};

function ClientArtReviewInner() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewContext, setReviewContext] = useState<ArtApprovalReviewContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [lastDelivery, setLastDelivery] = useState<"email" | "log" | null>(null);
  const [completed, setCompleted] = useState<{
    approval: ArtApproval;
    decision: ArtApprovalDecision;
  } | null>(null);
  /** Skip one context fetch when bootstrap already loaded review data (e.g. magic link). */
  const skipNextReviewContextFetchRef = useRef(false);

  useEffect(() => {
    skipNextReviewContextFetchRef.current = false;
  }, [token]);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code || !token) return;
    setError(MAGIC_LINK_ERROR_MESSAGES[code] ?? "Sign-in link could not be used.");
    router.replace(`/review/${encodeURIComponent(token)}`, { scroll: false });
  }, [searchParams, router, token]);

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await fetchArtApprovalReviewContext(token);
        if (!cancelled) {
          skipNextReviewContextFetchRef.current = true;
          setReviewContext(ctx);
          setStage("review");
        }
      } catch {
        /* no active review session */
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (stage !== "review" || !token) return;
    if (skipNextReviewContextFetchRef.current) {
      skipNextReviewContextFetchRef.current = false;
      setContextLoading(false);
      return;
    }
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
      const delivery = await requestArtApprovalOtp(token, email);
      setLastDelivery(delivery);
      setStage("otp");
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send sign-in link.");
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
      setReviewContext(null);
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecisionSuccess = (result: {
    approval: ArtApproval;
    decision: ArtApprovalDecision;
  }) => {
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

  if (bootstrapping) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-10">
        <div className="card">
          <p className="text-body text-text-secondary">Checking your session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10">
      <div className="card">
        <h1 className="text-section-title font-semibold text-text-primary">Art approval review</h1>
        <p className="mt-2 text-body text-text-secondary">
          Use the allowlisted work email your project team added for you. When outbound email is
          configured, you receive a one-time sign-in link (and a backup code), like internal users do
          for login—scoped to this art approval only. Otherwise your contact shares the link and code
          from server logs.
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
              {busy ? "Sending…" : "Email sign-in link"}
            </button>
          </form>
        ) : stage === "otp" ? (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="mt-6 space-y-4">
            {error ? (
              <p className="text-body text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {lastDelivery === "email" ? (
              <p className="text-body text-text-secondary">
                Check <span className="font-medium">{email}</span> for a sign-in link (open it on
                this device). You can also enter the 6-digit code from that message below.
              </p>
            ) : (
              <p className="text-body text-text-secondary">
                Enter the 6-digit code for <span className="font-medium">{email}</span>. Your
                project contact can copy the sign-in link and code from the application server logs
                if email delivery is not enabled.
              </p>
            )}
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
                  setLastDelivery(null);
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

export default function ClientArtReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg flex-1 px-4 py-10">
          <div className="card">
            <p className="text-body text-text-secondary">Loading…</p>
          </div>
        </main>
      }
    >
      <ClientArtReviewInner />
    </Suspense>
  );
}
