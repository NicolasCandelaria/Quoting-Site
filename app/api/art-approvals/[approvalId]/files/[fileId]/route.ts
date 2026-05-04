import { NextResponse } from "next/server";
import { getSessionUser, isEmailApproved } from "@/lib/server/auth";
import { deleteArtApprovalFile, SupabaseRequestError } from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";
import { isSupabaseStorageConfigured } from "@/lib/server/supabase-storage";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ approvalId: string; fileId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      { error: "Supabase Storage is not configured." },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isEmailApproved(user.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { approvalId, fileId } = await context.params;

  try {
    await deleteArtApprovalFile({ approvalId, fileId });
  } catch (error) {
    if (error instanceof SupabaseRequestError) {
      return NextResponse.json(
        { error: "Could not remove file record." },
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Delete failed.";
    if (message === "Art approval not found." || message === "File not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Approved records are read-only.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
