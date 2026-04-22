import { NextResponse } from "next/server";
import type { UpdateArtApprovalInput } from "@/lib/art-approvals/models";
import { getSessionUser } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  updateArtApprovalInSupabase,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUpdateBody(body: unknown): UpdateArtApprovalInput | null {
  if (!isPlainObject(body)) return null;
  const patch: UpdateArtApprovalInput = {};
  if ("title" in body && typeof body.title === "string") patch.title = body.title;
  if ("clientName" in body && typeof body.clientName === "string") {
    patch.clientName = body.clientName;
  }
  if ("status" in body && typeof body.status === "string") {
    patch.status = body.status as UpdateArtApprovalInput["status"];
  }
  if ("notes" in body) {
    if (body.notes === null) patch.notes = undefined;
    else if (typeof body.notes === "string") patch.notes = body.notes;
  }
  if ("optionalProjectId" in body) {
    if (body.optionalProjectId === null) patch.optionalProjectId = undefined;
    else if (typeof body.optionalProjectId === "string") {
      patch.optionalProjectId = body.optionalProjectId;
    }
  }
  if ("optionalItemId" in body) {
    if (body.optionalItemId === null) patch.optionalItemId = undefined;
    else if (typeof body.optionalItemId === "string") {
      patch.optionalItemId = body.optionalItemId;
    }
  }
  return patch;
}

function countPatchKeys(patch: UpdateArtApprovalInput): number {
  return Object.keys(patch).length;
}

async function handleUpdate(
  request: Request,
  approvalId: string,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch = parseUpdateBody(body);
  if (!patch || countPatchKeys(patch) === 0) {
    return NextResponse.json(
      { error: "At least one field is required to update." },
      { status: 400 },
    );
  }

  if ("title" in patch && !patch.title?.trim()) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
  }
  if ("clientName" in patch && !patch.clientName?.trim()) {
    return NextResponse.json(
      { error: "Client name cannot be empty." },
      { status: 400 },
    );
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
    await updateArtApprovalInSupabase(approvalId, patch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (message === "No fields to update.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("Invalid art approval status")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("not found") || message.includes("not updated")) {
      return NextResponse.json({ error: "Art approval not found." }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const approval = await getArtApprovalFromSupabase(approvalId);
  if (!approval) {
    return NextResponse.json(
      { error: "Art approval not found after update." },
      { status: 404 },
    );
  }
  return NextResponse.json({ approval });
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
  return handleUpdate(request, approvalId);
}

/** @deprecated Prefer PATCH; kept for existing client helpers that use POST. */
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
  return handleUpdate(request, approvalId);
}
