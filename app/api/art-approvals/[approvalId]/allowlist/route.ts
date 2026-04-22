import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { assertAllowlistEmails } from "@/lib/art-approvals/validation";
import {
  getArtApprovalFromSupabase,
  replaceAllowlistedEmailsForApproval,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { approvalId } = await context.params;

  let payload: { emails?: unknown };
  try {
    payload = (await request.json()) as { emails?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    assertAllowlistEmails(payload.emails);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid allowlist.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const current = await getArtApprovalFromSupabase(approvalId);
  if (!current) {
    return NextResponse.json({ error: "Art approval not found." }, { status: 404 });
  }

  if (current.status === "approved") {
    return NextResponse.json(
      { error: "Approved records are read-only." },
      { status: 409 },
    );
  }

  try {
    await replaceAllowlistedEmailsForApproval(approvalId, payload.emails);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const approval = await getArtApprovalFromSupabase(approvalId);
  if (!approval) {
    return NextResponse.json({ error: "Art approval not found." }, { status: 404 });
  }
  return NextResponse.json({ approval });
}
