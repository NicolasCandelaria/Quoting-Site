import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/art-approvals/validation";

import {
  ART_APPROVAL_OTP_CHALLENGE_TTL_MS,
  generateNumericOtpCode,
  getArtApprovalReadyForClientByRawToken,
  getOtpSendCooldownRemainingMs,
  insertArtApprovalOtpChallenge,
  isEmailAllowlistedForArtApproval,
  sendArtApprovalOtpEmail,
  signArtApprovalReviewMagicLink,
} from "@/lib/server/art-approvals";

import { isSupabaseConfigured } from "@/lib/server/supabase";

const GENERIC_NOT_FOUND = "Unable to process this request.";

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

  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPlainObject(body) || typeof body.email !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const approval = await getArtApprovalReadyForClientByRawToken(token);
  if (!approval) {
    return NextResponse.json({ error: GENERIC_NOT_FOUND }, { status: 404 });
  }

  const allowlisted = await isEmailAllowlistedForArtApproval(approval.id, email);
  if (!allowlisted) {
    return NextResponse.json({ error: GENERIC_NOT_FOUND }, { status: 404 });
  }

  const cooldownMs = await getOtpSendCooldownRemainingMs(approval.id, email);
  if (cooldownMs > 0) {
    return NextResponse.json(
      { error: "Please wait before requesting another code." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(cooldownMs / 1000)) },
      },
    );
  }

  const otp = generateNumericOtpCode();
  const expiresAt = new Date(Date.now() + ART_APPROVAL_OTP_CHALLENGE_TTL_MS).toISOString();

  let challengeId: string;
  try {
    const inserted = await insertArtApprovalOtpChallenge({
      artApprovalId: approval.id,
      email,
      otp,
      expiresAtIso: expiresAt,
    });
    challengeId = inserted.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ART_APPROVAL_OTP_SECRET")) {
      return NextResponse.json(
        { error: "Service is temporarily unavailable." },
        { status: 500 },
      );
    }
    throw error;
  }

  const origin = new URL(request.url).origin;
  const expUnixSec = Math.floor(new Date(expiresAt).getTime() / 1000);
  const signed = signArtApprovalReviewMagicLink({
    challengeId,
    email,
    expUnixSec,
  });
  const magicLinkUrl = `${origin}/api/art-approvals/review/${encodeURIComponent(token)}/email-link?s=${encodeURIComponent(signed)}`;

  const sent = await sendArtApprovalOtpEmail({
    to: email,
    otpCode: otp,
    approvalTitle: approval.title,
    magicLinkUrl,
  });

  const notice =
    sent.channel === "server_log" && sent.resendFailed
      ? "Email could not be sent (see Vercel logs for Resend errors). Your project team can share the sign-in link and code from application logs."
      : undefined;

  return NextResponse.json({
    ok: true,
    delivery: sent.channel === "resend" ? "email" : "log",
    ...(notice ? { notice } : {}),
  });
}
