import { NextResponse } from "next/server";
import { getSessionUser, isEmailApproved } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  uploadArtApprovalFile,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";
import { isSupabaseStorageConfigured } from "@/lib/server/supabase-storage";

const MAX_ART_APPROVAL_UPLOAD_BYTES = 25 * 1024 * 1024;

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

  const { approvalId } = await context.params;

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > MAX_ART_APPROVAL_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large." }, { status: 413 });
    }
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 415 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_ART_APPROVAL_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
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

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Could not read file." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_ART_APPROVAL_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  try {
    const { file: saved } = await uploadArtApprovalFile({
      approvalId,
      fileName: file.name || "upload",
      bytes,
      contentType: file.type || undefined,
      uploadedBy: user.email,
    });
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
