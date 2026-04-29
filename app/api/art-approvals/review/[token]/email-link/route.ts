import { NextResponse } from "next/server";

import {
  ART_APPROVAL_REVIEW_SESSION_COOKIE,
  ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC,
  consumeOtpChallengeAndSignReviewSession,
  fetchOtpChallengeById,
  getArtApprovalReadyForClientByRawToken,
  getArtApprovalReviewSessionSecret,
  getOtpChallengeCompletableState,
  isEmailAllowlistedForArtApproval,
  verifyArtApprovalReviewMagicLink,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

function redirectToReview(
  request: Request,
  token: string,
  errorCode?: string,
): NextResponse {
  const u = new URL(request.url);
  const dest = new URL(`/review/${encodeURIComponent(token)}`, u.origin);
  if (errorCode) dest.searchParams.set("error", errorCode);
  return NextResponse.redirect(dest);
}

export async function GET(
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
  const signed = new URL(request.url).searchParams.get("s");
  const envelope = verifyArtApprovalReviewMagicLink(signed);
  if (!envelope) {
    return redirectToReview(request, token, "magic_invalid");
  }

  const approval = await getArtApprovalReadyForClientByRawToken(token);
  if (!approval) {
    return redirectToReview(request, token, "magic_invalid");
  }

  const allowlisted = await isEmailAllowlistedForArtApproval(
    approval.id,
    envelope.email,
  );
  if (!allowlisted) {
    return redirectToReview(request, token, "magic_invalid");
  }

  const challenge = await fetchOtpChallengeById(envelope.cid);
  if (!challenge) {
    return redirectToReview(request, token, "magic_invalid");
  }

  const ready = getOtpChallengeCompletableState(challenge, approval, envelope.email);
  if (ready === "expired") {
    return redirectToReview(request, token, "magic_expired");
  }
  if (ready === "consumed") {
    return redirectToReview(request, token, "magic_used");
  }
  if (ready === "too_many_attempts") {
    return redirectToReview(request, token, "magic_attempts");
  }
  if (ready !== "ok") {
    return redirectToReview(request, token, "magic_invalid");
  }

  const finalized = await consumeOtpChallengeAndSignReviewSession({
    challengeId: challenge.id,
    approval,
    email: envelope.email,
  });
  if (!finalized.ok) {
    return redirectToReview(request, token, "magic_used");
  }

  const dest = new URL(`/review/${encodeURIComponent(token)}`, new URL(request.url).origin);
  const response = NextResponse.redirect(dest);
  response.cookies.set(ART_APPROVAL_REVIEW_SESSION_COOKIE, finalized.sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC,
  });
  return response;
}
