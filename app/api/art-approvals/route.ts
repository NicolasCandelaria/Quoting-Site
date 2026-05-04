import { NextResponse } from "next/server";
import { getSessionUser, isEmailApproved } from "@/lib/server/auth";
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
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isEmailApproved(user.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
  if (!(await isEmailApproved(user.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: {
    title?: string;
    clientName?: string;
    notes?: string;
    optionalProjectId?: string;
    optionalItemId?: string;
    formFields?: {
      material?: string;
      itemSize?: string;
      logos?: Array<{
        logo?: string;
        color?: string;
        location?: string;
        application?: string;
      }>;
      baseColor?: string;
      additionalNotes?: string;
    };
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
    const normalizedFormFields = payload.formFields
      ? {
          material: payload.formFields.material,
          itemSize: payload.formFields.itemSize,
          logos: Array.isArray(payload.formFields.logos)
            ? payload.formFields.logos.slice(0, 6).map((logo) => ({
                logo: typeof logo.logo === "string" ? logo.logo : "",
                color: typeof logo.color === "string" ? logo.color : "",
                location: typeof logo.location === "string" ? logo.location : "",
                application: typeof logo.application === "string" ? logo.application : "",
              }))
            : undefined,
          baseColor: payload.formFields.baseColor,
          additionalNotes: payload.formFields.additionalNotes,
        }
      : undefined;

    const summary = await createArtApprovalInSupabase({
      title: payload.title.trim(),
      clientName: payload.clientName.trim(),
      notes: payload.notes?.trim() || undefined,
      optionalProjectId: payload.optionalProjectId?.trim() || undefined,
      optionalItemId: payload.optionalItemId?.trim() || undefined,
      formFields: normalizedFormFields,
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
