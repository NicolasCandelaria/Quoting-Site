import { NextResponse } from "next/server";
import { deleteItemInSupabase, isSupabaseConfigured, upsertItemInSupabase } from "@/lib/server/supabase";
import { getSessionUser } from "@/lib/server/auth";
import type { Item } from "@/lib/models";
import { parseSanitizedJson, RequestInputError } from "@/lib/server/request-input";

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string; itemId: string }> },
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

  const { projectId, itemId } = await context.params;
  let payload: { item?: Item };
  try {
    payload = await parseSanitizedJson<typeof payload>(request);
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload.item || payload.item.id !== itemId) {
    return NextResponse.json(
      { error: "Payload item is missing or item id does not match URL." },
      { status: 400 },
    );
  }

  try {
    const project = await upsertItemInSupabase(projectId, payload.item);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; itemId: string }> },
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

  const { projectId, itemId } = await context.params;

  try {
    const project = await deleteItemInSupabase(projectId, itemId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
