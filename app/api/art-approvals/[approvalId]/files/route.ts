import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  uploadArtApprovalFile,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";
import { isSupabaseStorageConfigured } from "@/lib/server/supabase-storage";

function decodeBase64ToArrayBuffer(data: string): ArrayBuffer {
  const buf = Buffer.from(data, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

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

  const { approvalId } = await context.params;

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

  const contentType = request.headers.get("content-type") ?? "";

  let fileName: string;
  let bytes: ArrayBuffer;
  let mime: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file." }, { status: 400 });
      }
      fileName = file.name || "upload.bin";
      bytes = await file.arrayBuffer();
      mime = file.type || undefined;
    } else if (contentType.includes("application/json")) {
      const json = (await request.json()) as {
        fileName?: string;
        contentBase64?: string;
        contentType?: string;
      };
      if (!json.fileName?.trim() || !json.contentBase64?.trim()) {
        return NextResponse.json(
          { error: "fileName and contentBase64 are required for JSON upload." },
          { status: 400 },
        );
      }
      fileName = json.fileName.trim();
      bytes = decodeBase64ToArrayBuffer(json.contentBase64.trim());
      mime = json.contentType?.trim() || undefined;
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported content type. Use multipart/form-data with a `file` field or application/json with fileName and contentBase64.",
        },
        { status: 415 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid upload body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  try {
    const { file } = await uploadArtApprovalFile({
      approvalId,
      fileName,
      bytes,
      contentType: mime,
      uploadedBy: user.email,
    });
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
