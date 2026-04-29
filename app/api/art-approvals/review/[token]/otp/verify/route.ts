import { NextResponse } from "next/server";
import {
  assertValidOtpCode,
  normalizeEmail,
} from "@/lib/art-approvals/validation";
import {
  ART_APPROVAL_MAX_OTP_VERIFY_ATTEMPTS,
  ART_APPROVAL_REVIEW_SESSION_COOKIE,
  ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC,
  consumeOtpChallengeAndSignReviewSession,
  fetchLatestOpenOtpChallenge,
  getArtApprovalReadyForClientByRawToken,
  getArtApprovalReviewSessionSecret,
  incrementArtApprovalOtpChallengeAttempts,
  isEmailAllowlistedForArtApproval,
  verifyOtpCode,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

const GENERIC_VERIFY_FAIL = "Invalid or expired verification code.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Service is temporarily unavailable." },
      { status: 500 },
    );
  }

  try {
    getArtApprovalReviewSessionSecret();
  } catch {
    return NextResponse.json(
      { error: "Service is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { token } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !isPlainObject(body) ||
    typeof body.email !== "string" ||
    typeof body.code !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const code = body.code.trim();
  if (!email.includes("@")) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  try {
    assertValidOtpCode(code);
  } catch {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  const approval = await getArtApprovalReadyForClientByRawToken(token);
  if (!approval) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  const allowlisted = await isEmailAllowlistedForArtApproval(approval.id, email);
  if (!allowlisted) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  const challenge = await fetchLatestOpenOtpChallenge(approval.id, email);
  if (!challenge) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  if (challenge.attempts >= ART_APPROVAL_MAX_OTP_VERIFY_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Request a new code." },
      { status: 429 },
    );
  }

  const expires = new Date(challenge.expires_at).getTime();
  if (Number.isNaN(expires) || expires <= Date.now()) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  let matches = false;
  try {
    matches = await verifyOtpCode(code, challenge.otp_hash);
  } catch {
    return NextResponse.json(
      { error: "Service is temporarily unavailable." },
      { status: 500 },
    );
  }

  if (!matches) {
    let newAttempts: number | null;
    try {
      newAttempts = await incrementArtApprovalOtpChallengeAttempts(challenge.id);
    } catch (error) {
      console.error("[art-approval] atomic OTP attempt increment failed", error);
      return NextResponse.json(
        { error: "Service is temporarily unavailable." },
        { status: 500 },
      );
    }
    if (
      newAttempts !== null &&
      newAttempts >= ART_APPROVAL_MAX_OTP_VERIFY_ATTEMPTS
    ) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new code." },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  let finalized;
  try {
    finalized = await consumeOtpChallengeAndSignReviewSession({
      challengeId: challenge.id,
      approval,
      email,
    });
  } catch (error) {
    console.error("[art-approval] atomic OTP consume failed", error);
    return NextResponse.json(
      { error: "Service is temporarily unavailable." },
      { status: 500 },
    );
  }
  if (!finalized.ok) {
    return NextResponse.json({ error: GENERIC_VERIFY_FAIL }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ART_APPROVAL_REVIEW_SESSION_COOKIE, finalized.sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC,
  });

  return response;
}

