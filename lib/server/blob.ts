const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function assertBlobConfigured() {
  if (!BLOB_TOKEN) {
    throw new Error(
      "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN.",
    );
  }
}

export async function uploadToVercelBlob(file: File): Promise<string> {
  assertBlobConfigured();

  const ext = file.name.split(".").pop() || "bin";
  const pathname = `quote-items/${crypto.randomUUID()}.${ext}`;
  const url = `https://blob.vercel-storage.com/${pathname}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${BLOB_TOKEN as string}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-content-type": file.type || "application/octet-stream",
      "x-add-random-suffix": "0",
    },
    body: file,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Blob upload failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { url?: string };

  if (!data.url) {
    throw new Error("Blob upload succeeded but response did not include a URL.");
  }

  return data.url;
}

export function isBlobConfigured() {
  return Boolean(BLOB_TOKEN);
}
