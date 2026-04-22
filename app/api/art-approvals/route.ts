import { NextResponse } from "next/server";

import type { CreateArtApprovalInput } from "@/lib/art-approvals/models";
import { getSessionUser } from "@/lib/server/auth";
import {
  createArtApprovalInSupabase,
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";

  if (!title || !clientName) {
    return NextResponse.json(
      { error: "Title and client name are required." },
      { status: 400 },
    );
  }

  const input: CreateArtApprovalInput = {
    title,
    clientName,
    notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
    optionalProjectId:
      typeof body.optionalProjectId === "string" && body.optionalProjectId.trim()
        ? body.optionalProjectId.trim()
        : undefined,
    optionalItemId:
      typeof body.optionalItemId === "string" && body.optionalItemId.trim()
        ? body.optionalItemId.trim()
        : undefined,
  };

  try {
    const approval = await createArtApprovalInSupabase({
      ...input,
      createdBy: user.email,
    });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
