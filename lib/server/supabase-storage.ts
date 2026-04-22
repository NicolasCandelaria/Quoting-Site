import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sanitizeStorageFileName } from "../art-approvals/validation";

/**
 * Item images are stored in Supabase Storage. Create a bucket named "item-images"
 * in the Supabase dashboard and set it to public so image URLs work for client and PDF.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "item-images";
const ART_APPROVAL_BUCKET = "art-approvals";

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Create the item-images bucket if it doesn't exist (public for read-only URLs). */
async function ensureBucketExists(): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (error && !error.message?.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create storage bucket: ${error.message}`);
  }
}

/** Private bucket for art approval assets (served only via authorized routes). */
async function ensureArtApprovalsBucketExists(): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.createBucket(ART_APPROVAL_BUCKET, {
    public: false,
  });
  if (error && !error.message?.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create art-approvals bucket: ${error.message}`);
  }
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [header, base64] = dataUrl.split(",");
  if (!base64) throw new Error("Invalid data URL");
  const mimeMatch = header?.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const ext = mime === "image/png" ? "png" : "jpg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mime }), ext };
}

/**
 * Upload a raw file (e.g. from multipart form) to Supabase Storage.
 * Used by the uploads API when the dropzone adds images.
 * Path: item-images/{uuid}.{ext}
 */
export async function uploadFile(file: Blob | File): Promise<string> {
  await ensureBucketExists();
  const supabase = getClient();
  const ext =
    file instanceof File && file.name
      ? file.name.split(".").pop()?.toLowerCase() || "bin"
      : "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Upload a single image (data URL) to Supabase Storage.
 * Returns the public URL for the stored image.
 * Path: {itemId}/{index}.{ext}
 */
export async function uploadItemImage(
  dataUrl: string,
  itemId: string,
  index: number,
): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Expected a data URL for an image.");
  }
  await ensureBucketExists();
  const { blob, ext } = dataUrlToBlob(dataUrl);
  const supabase = getClient();
  const path = `${itemId}/${index}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Upload all data-URL images for an item to Supabase Storage.
 * Returns array of URLs (same order); leaves existing http(s) URLs unchanged.
 */
export async function uploadItemImages(
  images: string[],
  itemId: string,
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < images.length; i += 1) {
    const src = images[i];
    if (!src) {
      results.push("");
      continue;
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      results.push(src);
      continue;
    }
    const url = await uploadItemImage(src, itemId, i);
    results.push(url);
  }
  return results;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Upload bytes for an art approval package.
 * Path shape: `{approvalId}/{contentSha256Prefix}_{sanitizedOriginalName}` (deterministic for same bytes + name).
 */
export async function uploadArtApprovalFileToStorage(params: {
  approvalId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType?: string;
}): Promise<{ storagePath: string }> {
  await ensureArtApprovalsBucketExists();
  const supabase = getClient();
  const digest = createHash("sha256")
    .update(Buffer.from(params.bytes))
    .digest("hex")
    .slice(0, 24);
  const safeName = sanitizeStorageFileName(params.fileName);
  const storagePath = `${params.approvalId}/${digest}_${safeName}`;
  const blob = new Blob([params.bytes], {
    type: params.contentType || "application/octet-stream",
  });

  const { error } = await supabase.storage
    .from(ART_APPROVAL_BUCKET)
    .upload(storagePath, blob, {
      contentType: params.contentType || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(`Art approval file upload failed: ${error.message}`);
  }

  return { storagePath };
}
