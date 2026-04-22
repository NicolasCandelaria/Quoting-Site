import { NextResponse } from "next/server";
import type { ClientDecisionPayload } from "@/lib/art-approvals/models";
import {
  assertClientDecisionPayload,
  isValidDecisionType,
} from "@/lib/art-approvals/validation";
import {
  ART_APPROVAL_REVIEW_SESSION_COOKIE,
  getArtApprovalReadyForClientByRawToken,
  saveClientDecision,
  verifyArtApprovalReviewSession,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClientDecisionBody(body: unknown): ClientDecisionPayload | null {
  if (!isPlainObject(body)) return null;
  if (typeof body.decisionType !== "string") return null;
  if (!isValidDecisionType(body.decisionType)) return null;
  if (typeof body.typedFullName !== "string") return null;
  if (typeof body.confirmed !== "boolean") return null;
  const comment =
    "comment" in body && body.comment === null
      ? undefined
      : "comment" in body && typeof body.comment === "string"
        ? body.comment
        : undefined;
  return {
    decisionType: body.decisionType,
    typedFullName: body.typedFullName,
    comment,
    confirmed: body.confirmed,
  };
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

  const payload = parseClientDecisionBody(body);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (payload.decisionType === "changes_requested" && !payload.comment?.trim()) {
    return NextResponse.json(
      { error: "Comment is required." },
      { status: 400 },
    );
  }
  if (!payload.typedFullName?.trim()) {
    return NextResponse.json(
      { error: "Full name is required." },
      { status: 400 },
    );
  }

  try {
    assertClientDecisionPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const approval = await getArtApprovalReadyForClientByRawToken(token);
  const cookieHeader = request.headers.get("cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ART_APPROVAL_REVIEW_SESSION_COOKIE}=`));
  const eq = sessionCookie?.indexOf("=");
  const rawCookieEncoded =
    sessionCookie && eq !== undefined && eq >= 0
      ? sessionCookie.slice(eq + 1)
      : undefined;
  let rawCookie: string | undefined;
  try {
    rawCookie = rawCookieEncoded
      ? decodeURIComponent(rawCookieEncoded)
      : undefined;
  } catch {
    rawCookie = rawCookieEncoded;
  }
  const session = verifyArtApprovalReviewSession(rawCookie);

  if (
    !approval ||
    !session ||
    session.approvalId !== approval.id ||
    session.round !== approval.round
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await saveClientDecision({
      token,
      verifiedEmail: session.email,
      ...payload,
    });

    const response = NextResponse.json({
      approval: result.approval,
      decision: result.decision,
    });
    response.cookies.set(ART_APPROVAL_REVIEW_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (message.includes("Invalid or expired review link")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (message.includes("not open for client review")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (message.includes("not allowlisted")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (message.includes("already been recorded")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
