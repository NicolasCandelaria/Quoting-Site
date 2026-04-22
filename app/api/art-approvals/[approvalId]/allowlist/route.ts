import { NextResponse } from "next/server";

import { assertAllowlistEmailArray } from "@/lib/art-approvals/validation";
import { getSessionUser } from "@/lib/server/auth";
import { replaceAllowlistedEmailsForApproval } from "@/lib/server/art-approvals";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !Array.isArray((body as { emails?: unknown }).emails)) {
    return NextResponse.json({ error: "Body must include an emails array." }, { status: 400 });
  }

  const emails = (body as { emails: unknown }).emails;

  try {
    assertAllowlistEmailArray(emails);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid allowlist.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const allowlistedEmails = await replaceAllowlistedEmailsForApproval(approvalId, emails);
    return NextResponse.json({ allowlistedEmails });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
