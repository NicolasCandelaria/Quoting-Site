import type {
  ArtApprovalDecisionType,
  ArtApprovalStatus,
  ClientDecisionPayload,
} from "./models";

const ART_APPROVAL_STATUSES: ArtApprovalStatus[] = [
  "draft",
  "with_designer",
  "ready_for_client",
  "approved",
  "changes_requested",
];

const DECISION_TYPES: ArtApprovalDecisionType[] = ["approved", "changes_requested"];

/** Lowercase + trim, suitable for DB allowlist / OTP email columns. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidArtApprovalStatus(value: string): value is ArtApprovalStatus {
  return (ART_APPROVAL_STATUSES as string[]).includes(value);
}

export function isValidDecisionType(value: string): value is ArtApprovalDecisionType {
  return (DECISION_TYPES as string[]).includes(value);
}

/** Six-digit numeric string (leading zeros allowed). */
export function isValidOtpCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function assertValidOtpCode(code: string): void {
  if (!isValidOtpCodeFormat(code)) {
    throw new Error("OTP must be a 6-digit code.");
  }
}

export function normalizeAllowlistEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const n = normalizeEmail(raw);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Each entry must look like an email; array may be empty (clears allowlist). */
export function assertAllowlistEmailArray(emails: unknown): asserts emails is string[] {
  if (!Array.isArray(emails)) {
    throw new Error("Allowlist must be an array of email strings.");
  }
  for (const e of emails) {
    if (typeof e !== "string" || !normalizeEmail(e).includes("@")) {
      throw new Error("Each allowlist entry must be a valid email string.");
    }
  }
}

export function assertAllowlistEmails(emails: unknown): asserts emails is string[] {
  assertAllowlistEmailArray(emails);
  if (emails.length === 0) {
    throw new Error("At least one allowlisted email is required.");
  }
}

/** Safe file segment for storage paths (no slashes). */
export function sanitizeStorageFileName(name: string): string {
  const trimmed = name.trim() || "file";
  const cleaned = trimmed.replace(/[/\\]/g, "_").replace(/[^\w.\-()+@[\] ]/g, "_");
  return cleaned.slice(0, 180) || "file.bin";
}

export function assertClientDecisionPayload(payload: ClientDecisionPayload): void {
  if (!payload.confirmed) {
    throw new Error("Confirmation is required.");
  }
  if (!payload.typedFullName?.trim()) {
    throw new Error("Full name is required.");
  }
  if (!isValidDecisionType(payload.decisionType)) {
    throw new Error("Invalid decision type.");
  }
  if (payload.decisionType === "changes_requested") {
    if (!payload.comment?.trim()) {
      throw new Error("Comment is required for changes requested.");
    }
  }
}

export function assertUpdateArtApprovalStatus(status: string): asserts status is ArtApprovalStatus {
  if (!isValidArtApprovalStatus(status)) {
    throw new Error("Invalid art approval status.");
  }
}
