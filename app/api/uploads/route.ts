import { NextResponse } from "next/server";
import {
  uploadFile,
  isSupabaseStorageConfigured,
} from "@/lib/server/supabase-storage";
import { getSessionUser, isEmailApproved } from "@/lib/server/auth";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 415 },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large." }, { status: 413 });
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 415 },
    );
  }

  try {
    const url = await uploadFile(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
