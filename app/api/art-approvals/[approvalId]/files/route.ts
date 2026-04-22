import { NextResponse } from "next/server";
import { getSessionUser, isEmailApproved } from "@/lib/server/auth";
import {
  getArtApprovalFromSupabase,
  uploadArtApprovalFile,
} from "@/lib/server/art-approvals";
import { isSupabaseConfigured } from "@/lib/server/supabase";
import { isSupabaseStorageConfigured } from "@/lib/server/supabase-storage";

/** Maximum decoded file size for art approval uploads (25MB). */
const MAX_ART_APPROVAL_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Extra room for multipart boundaries and non-file fields. */
const MULTIPART_BODY_OVERHEAD_BYTES = 256 * 1024;
/** Upper bound on JSON body size (base64 expands raw by ~4/3). */
const MAX_JSON_UPLOAD_BODY_BYTES =
  Math.ceil((MAX_ART_APPROVAL_UPLOAD_BYTES * 4) / 3) + 16_384;

function parseContentLength(request: Request): number | undefined {
  const raw = request.headers.get("content-length");
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function decodedUpperBoundFromBase64(b64: string): number {
  const t = b64.replace(/\s/g, "");
  if (!t.length) return 0;
  const pad = t.endsWith("==") ? 2 : t.endsWith("=") ? 1 : 0;
  return Math.floor((t.length * 3) / 4) - pad;
}

function decodeBase64ToArrayBuffer(data: string): ArrayBuffer {
  const buf = Buffer.from(data, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function payloadTooLargeResponse() {
  return NextResponse.json(
    {
      error: `File exceeds maximum size of ${MAX_ART_APPROVAL_UPLOAD_BYTES / (1024 * 1024)}MB.`,
    },
    { status: 413 },
  );
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
  if (!(await isEmailApproved(user.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
  const contentLength = parseContentLength(request);

  let fileName: string;
  let bytes: ArrayBuffer;
  let mime: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      if (
        contentLength !== undefined &&
        contentLength > MAX_ART_APPROVAL_UPLOAD_BYTES + MULTIPART_BODY_OVERHEAD_BYTES
      ) {
        return payloadTooLargeResponse();
      }
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file." }, { status: 400 });
      }
      if (file.size > MAX_ART_APPROVAL_UPLOAD_BYTES) {
        return payloadTooLargeResponse();
      }
      fileName = file.name || "upload.bin";
      bytes = await file.arrayBuffer();
      mime = file.type || undefined;
      if (bytes.byteLength > MAX_ART_APPROVAL_UPLOAD_BYTES) {
        return payloadTooLargeResponse();
      }
    } else if (contentType.includes("application/json")) {
      if (
        contentLength !== undefined &&
        contentLength > MAX_JSON_UPLOAD_BODY_BYTES
      ) {
        return payloadTooLargeResponse();
      }
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
      const b64 = json.contentBase64.trim();
      if (decodedUpperBoundFromBase64(b64) > MAX_ART_APPROVAL_UPLOAD_BYTES) {
        return payloadTooLargeResponse();
      }
      fileName = json.fileName.trim();
      bytes = decodeBase64ToArrayBuffer(b64);
      mime = json.contentType?.trim() || undefined;
      if (bytes.byteLength > MAX_ART_APPROVAL_UPLOAD_BYTES) {
        return payloadTooLargeResponse();
      }
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
