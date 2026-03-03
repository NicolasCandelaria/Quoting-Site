import { NextResponse } from "next/server";
import {
  createProjectInSupabase,
  isSupabaseConfigured,
  listProjectsFromSupabase,
} from "@/lib/server/supabase";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  try {
    const projects = await listProjectsFromSupabase();
    return NextResponse.json({ projects });
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

  const payload = (await request.json()) as {
    name?: string;
    client?: string;
    notes?: string;
  };

  if (!payload.name?.trim() || !payload.client?.trim()) {
    return NextResponse.json(
      { error: "Project name and client are required." },
      { status: 400 },
    );
  }

  try {
    const project = await createProjectInSupabase({
      name: payload.name.trim(),
      client: payload.client.trim(),
      notes: payload.notes?.trim() || undefined,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
