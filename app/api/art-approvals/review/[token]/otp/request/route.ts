import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/art-approvals/validation";
import {
  getArtApprovalReadyForClientByRawToken,
  isEmailAllowlistedForArtApproval,
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

  return NextResponse.json({
    ok: true,
    nextPath: `/review/${encodeURIComponent(token)}`,
  });
}
