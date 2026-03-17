"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "not-approved") {
      setErrorMessage("This email is not approved for access.");
      setStatus("error");
    } else if (error) {
      setErrorMessage(
        error === "callback_failed"
          ? "Sign-in failed. Please try again."
          : "Something went wrong. Please try again.",
      );
      setStatus("error");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage("Please enter your email.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMessage("");
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <header>
        <h1 className="text-page-title font-semibold text-text-primary">
          Sign in
        </h1>
        <p className="text-body text-text-secondary mt-1">
          Enter your email and we&apos;ll send you a magic link to sign in.
        </p>
      </header>
      {status === "sent" ? (
        <div className="card p-4">
          <p className="text-body text-text-primary">
            Check your email for the magic link. Click it to sign in.
          </p>
          <p className="text-body text-text-secondary mt-2">
            You can close this tab after opening the link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input w-full"
              autoComplete="email"
              disabled={status === "sending"}
            />
          </div>
          {errorMessage && (
            <p className="text-body text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
          {status === "error" && (
            <p className="text-body text-text-secondary">
              If your email is not approved for access, you will not be able to
              sign in.
            </p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
      <p className="text-body text-text-secondary">
        <Link href="/" className="underline hover:no-underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 max-w-md">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

