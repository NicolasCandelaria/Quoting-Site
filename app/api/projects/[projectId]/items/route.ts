import { NextResponse } from "next/server";
import { isSupabaseConfigured, upsertItemInSupabase } from "@/lib/server/supabase";
import { getSessionUser } from "@/lib/server/auth";
import type { Item } from "@/lib/models";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
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

  const { projectId } = await context.params;
  const payload = (await request.json()) as { item?: Item };

  if (!payload.item) {
    return NextResponse.json({ error: "Missing item payload." }, { status: 400 });
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
