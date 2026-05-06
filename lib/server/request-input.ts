const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const MAX_NESTING_DEPTH = 20;
const MAX_OBJECT_KEYS = 200;
const MAX_ARRAY_ITEMS = 500;
const MAX_STRING_LENGTH = 5_000;

export class RequestInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestInputError";
    this.status = status;
  }
}

function sanitizeString(value: string): string {
  const noControlChars = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const normalizedWhitespace = noControlChars.replace(/\s+/g, " ").trim();
  if (normalizedWhitespace.length > MAX_STRING_LENGTH) {
    throw new RequestInputError("Input contains an oversized string value.", 413);
  }
  return normalizedWhitespace;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_NESTING_DEPTH) {
    throw new RequestInputError("Input is malformed (too deeply nested).");
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      throw new RequestInputError("Input array is too large.", 413);
    }
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > MAX_OBJECT_KEYS) {
      throw new RequestInputError("Input object is too large.", 413);
    }
    const output: Record<string, unknown> = {};
    for (const [key, child] of entries) {
      output[key] = sanitizeValue(child, depth + 1);
    }
    return output;
  }

  throw new RequestInputError("Input is malformed.");
}

export async function parseSanitizedJson<T>(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new RequestInputError("Request body is too large.", 413);
    }
  }

  const raw = await request.text();
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > maxBytes) {
    throw new RequestInputError("Request body is too large.", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RequestInputError("Invalid JSON body.");
  }

  return sanitizeValue(parsed, 0) as T;
}
