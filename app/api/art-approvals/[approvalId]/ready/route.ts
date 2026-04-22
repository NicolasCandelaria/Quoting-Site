import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  markArtApprovalReadyForClient,
} from "@/lib/server/art-approvals";
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
    const { reviewToken } = await markArtApprovalReadyForClient(approvalId);
    const approval = await getArtApprovalFromSupabase(approvalId);
    if (!approval) {
      return NextResponse.json(
        { error: "Art approval not found after update." },
        { status: 404 },
      );
    }
    return NextResponse.json({ approval, reviewToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message.includes("Approved records") ||
      message.includes("already ready for client") ||
      message.includes("Only draft or with_designer")
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("At least one allowlisted")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
