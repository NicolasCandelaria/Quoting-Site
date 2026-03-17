import { NextResponse } from "next/server";
import {
  deleteProjectInSupabase,
  getProjectFromSupabase,
  isSupabaseConfigured,
  saveProjectInSupabase,
} from "@/lib/server/supabase";
import { getSessionUser } from "@/lib/server/auth";
import type { Project } from "@/lib/models";

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
  const payload = (await request.json()) as { project?: Project };

  if (!payload.project || payload.project.id !== projectId) {
    return NextResponse.json(
      { error: "Project payload missing or project id mismatch." },
      { status: 400 },
    );
  }

  try {
    const project = await saveProjectInSupabase(payload.project);
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

  try {
    await deleteProjectInSupabase(projectId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
