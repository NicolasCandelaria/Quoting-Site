import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/server/auth";
import { markArtApprovalReadyForClient } from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export async function POST(
  _request: Request,
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

  try {
    const result = await markArtApprovalReadyForClient(approvalId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    const lower = message.toLowerCase();
    if (lower.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      lower.includes("already ready") ||
      lower.includes("allowlisted") ||
      lower.includes("cannot be marked") ||
      lower.includes("only draft")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
