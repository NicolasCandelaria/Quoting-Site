import { NextResponse } from "next/server";
import { deleteItemInSupabase, isSupabaseConfigured, upsertItemInSupabase } from "@/lib/server/supabase";
import type { Item } from "@/lib/models";

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

  const { projectId, itemId } = await context.params;
  const payload = (await request.json()) as { item?: Item };

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
