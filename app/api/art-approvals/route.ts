import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import {
  createArtApprovalInSupabase,
  getArtApprovalFromSupabase,
  listArtApprovalsFromSupabase,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export async function GET() {
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

  try {
    const approvals = await listArtApprovalsFromSupabase();
    return NextResponse.json({ approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: {
    title?: string;
    clientName?: string;
    notes?: string;
    optionalProjectId?: string;
    optionalItemId?: string;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.title?.trim() || !payload.clientName?.trim()) {
    return NextResponse.json(
      { error: "Title and client name are required." },
      { status: 400 },
    );
  }

  try {
    const summary = await createArtApprovalInSupabase({
      title: payload.title.trim(),
      clientName: payload.clientName.trim(),
      notes: payload.notes?.trim() || undefined,
      optionalProjectId: payload.optionalProjectId?.trim() || undefined,
      optionalItemId: payload.optionalItemId?.trim() || undefined,
      createdBy: user.email,
    });
    const approval = await getArtApprovalFromSupabase(summary.id);
    if (!approval) {
      return NextResponse.json(
        { error: "Art approval was created but could not be loaded." },
        { status: 500 },
      );
    }
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
