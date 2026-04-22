import { NextResponse } from "next/server";

import type { UpdateArtApprovalInput } from "@/lib/art-approvals/models";
import { isValidArtApprovalStatus } from "@/lib/art-approvals/validation";
import { getSessionUser } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  updateArtApprovalInSupabase,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

function parseUpdatePatch(body: unknown): UpdateArtApprovalInput | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  const patch: UpdateArtApprovalInput = {};

  if (typeof o.title === "string") {
    const t = o.title.trim();
    if (t) patch.title = t;
  }
  if (typeof o.clientName === "string") {
    const c = o.clientName.trim();
    if (c) patch.clientName = c;
  }
  if ("notes" in o && typeof o.notes === "string") {
    patch.notes = o.notes.trim();
  }
  if (o.optionalProjectId === null) {
    patch.optionalProjectId = undefined;
  } else if (typeof o.optionalProjectId === "string" && o.optionalProjectId.trim()) {
    patch.optionalProjectId = o.optionalProjectId.trim();
  }
  if (o.optionalItemId === null) {
    patch.optionalItemId = undefined;
  } else if (typeof o.optionalItemId === "string" && o.optionalItemId.trim()) {
    patch.optionalItemId = o.optionalItemId.trim();
  }
  if (typeof o.status === "string" && isValidArtApprovalStatus(o.status)) {
    patch.status = o.status;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export async function GET(
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
    const approval = await getArtApprovalFromSupabase(approvalId);
    if (!approval) {
      return NextResponse.json({ error: "Art approval not found." }, { status: 404 });
    }
    return NextResponse.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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

  const patch = parseUpdatePatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );
  }

  try {
    const approval = await updateArtApprovalInSupabase(approvalId, patch);
    return NextResponse.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    const lower = message.toLowerCase();
    if (lower.includes("not found") || lower.includes("no fields to update")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (lower.includes("read-only") || lower.includes("approved records")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
