import { NextResponse } from "next/server";
import { getProjectFromSupabase, isSupabaseConfigured } from "@/lib/server/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const { projectId } = await context.params;

  try {
    const project = await getProjectFromSupabase(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
