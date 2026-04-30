import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type {
  ArtApprovalAllowlistedEmail,
  ArtApprovalDecision,
  ArtApprovalDetail,
  ArtApprovalFile,
  ArtApprovalStatus,
  ArtApprovalSummary,
  ClientDecisionPayload,
  CreateArtApprovalInput,
  UpdateArtApprovalInput,
} from "../art-approvals/models";
import {
  assertAllowlistEmailArray,
  assertClientDecisionPayload,
  assertUpdateArtApprovalStatus,
  assertValidOtpCode,
  normalizeAllowlistEmails,
  normalizeEmail,
} from "../art-approvals/validation";
import { uploadArtApprovalFileToStorage } from "./supabase-storage";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Thrown when Supabase REST returns a non-2xx response (includes HTTP status). */
export class SupabaseRequestError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Supabase request failed (${status}): ${responseBody}`);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

function headers() {
  assertSupabaseConfigured();
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY as string}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertSupabaseConfigured();
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SupabaseRequestError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

type SupabaseRowArtApproval = {
  id: string;
  title: string;
  client_name: string;
  status: string;
  round: number;
  optional_project_id: string | null;
  optional_item_id?: string | null;
  notes: string | null;
  review_token_hash: string | null;
  ready_for_client_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SupabaseRowAllowlist = {
  id: string;
  art_approval_id: string;
  email: string;
  created_at: string;
};

type SupabaseRowFile = {
  id: string;
  art_approval_id: string;
  storage_path: string;
  original_name: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

type SupabaseRowDecision = {
  id: string;
  art_approval_id: string;
  round: number;
  decision_type: string;
  verified_email: string;
  typed_full_name: string;
  comment: string | null;
  decided_at: string;
};

function assertStatus(value: string): ArtApprovalStatus {
  if (
    value === "draft" ||
    value === "with_designer" ||
    value === "ready_for_client" ||
    value === "approved" ||
    value === "changes_requested"
  ) {
    return value;
  }
  throw new Error(`Unexpected art approval status from database: ${value}`);
}

function toSummary(row: SupabaseRowArtApproval): ArtApprovalSummary {
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    status: assertStatus(row.status),
    round: row.round,
    optionalProjectId: row.optional_project_id ?? undefined,
    optionalItemId: row.optional_item_id ?? undefined,
    notes: row.notes ?? undefined,
    reviewTokenHash: row.review_token_hash ?? undefined,
    readyForClientAt: row.ready_for_client_at ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAllowlistRow(row: SupabaseRowAllowlist): ArtApprovalAllowlistedEmail {
  return {
    id: row.id,
    artApprovalId: row.art_approval_id,
    email: row.email,
    createdAt: row.created_at,
  };
}

function toFileRow(row: SupabaseRowFile): ArtApprovalFile {
  return {
    id: row.id,
    artApprovalId: row.art_approval_id,
    storagePath: row.storage_path,
    originalName: row.original_name,
    contentType: row.content_type ?? undefined,
    sizeBytes: Number(row.size_bytes),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function toDecisionRow(row: SupabaseRowDecision): ArtApprovalDecision {
  const decisionType = row.decision_type;
  if (decisionType !== "approved" && decisionType !== "changes_requested") {
    throw new Error(`Unexpected decision_type: ${decisionType}`);
  }
  return {
    id: row.id,
    artApprovalId: row.art_approval_id,
    round: row.round,
    decisionType,
    verifiedEmail: row.verified_email,
    typedFullName: row.typed_full_name,
    comment: row.comment ?? undefined,
    decidedAt: row.decided_at,
  };
}

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Server secret for OTP at-rest hashing (HMAC-SHA256 pepper).
 * Must be set in any environment that stores or verifies art approval OTP codes.
 */
export function getArtApprovalOtpSecret(): string {
  const secret = process.env.ART_APPROVAL_OTP_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "ART_APPROVAL_OTP_SECRET must be set to a string of at least 16 characters to store or verify art approval OTP codes.",
    );
  }
  return secret;
}

function hmacOtpDigest(otp: string): string {
  return createHmac("sha256", getArtApprovalOtpSecret())
    .update(otp, "utf8")
    .digest("hex");
}

export async function hashOtpCode(otp: string): Promise<string> {
  assertValidOtpCode(otp);
  return hmacOtpDigest(otp);
}

export async function verifyOtpCode(
  otp: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash || typeof storedHash !== "string") return false;
  try {
    assertValidOtpCode(otp);
  } catch {
    return false;
  }
  let candidate: string;
  try {
    candidate = hmacOtpDigest(otp);
  } catch {
    throw new Error(
      "ART_APPROVAL_OTP_SECRET must be set to a string of at least 16 characters to store or verify art approval OTP codes.",
    );
  }
  if (candidate.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(candidate, "utf8"), Buffer.from(storedHash, "utf8"));
  } catch {
    return false;
  }
}

/** Cryptographically random 6-digit OTP (string, zero-padded). */
export function generateNumericOtpCode(): string {
  const n = randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

/** URL-safe opaque token for client review links (~43 chars base64url). */
export function generateReviewToken(): string {
  return randomBytes(32).toString("base64url");
}

const approvalSelect =
  "id,title,client_name,status,round,optional_project_id,optional_item_id,notes,review_token_hash,ready_for_client_at,created_by,created_at,updated_at";

export async function listArtApprovalsFromSupabase(): Promise<ArtApprovalSummary[]> {
  const rows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?select=${approvalSelect}&order=created_at.desc`,
  );
  return rows.map(toSummary);
}

export async function getArtApprovalFromSupabase(
  approvalId: string,
): Promise<ArtApprovalDetail | undefined> {
  const approvals = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?select=${approvalSelect}&id=eq.${approvalId}&limit=1`,
  );
  const row = approvals[0];
  if (!row) return undefined;

  const [allowlisted, files, decisions] = await Promise.all([
    request<SupabaseRowAllowlist[]>(
      `/art_approval_allowlisted_emails?select=id,art_approval_id,email,created_at&art_approval_id=eq.${approvalId}&order=created_at.asc`,
    ),
    request<SupabaseRowFile[]>(
      `/art_approval_files?select=id,art_approval_id,storage_path,original_name,content_type,size_bytes,uploaded_by,created_at&art_approval_id=eq.${approvalId}&order=created_at.desc`,
    ),
    request<SupabaseRowDecision[]>(
      `/art_approval_client_decisions?select=id,art_approval_id,round,decision_type,verified_email,typed_full_name,comment,decided_at&art_approval_id=eq.${approvalId}&order=decided_at.desc`,
    ),
  ]);

  return {
    ...toSummary(row),
    allowlistedEmails: allowlisted.map(toAllowlistRow),
    files: files.map(toFileRow),
    decisions: decisions.map(toDecisionRow),
  };
}

export async function createArtApprovalInSupabase(
  input: CreateArtApprovalInput & { createdBy: string },
): Promise<ArtApprovalSummary> {
  const body = [
    {
      title: input.title,
      client_name: input.clientName,
      notes: input.notes ?? null,
      optional_project_id: input.optionalProjectId ?? null,
      optional_item_id: input.optionalItemId ?? null,
      created_by: input.createdBy,
    },
  ];
  const rows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?select=${approvalSelect}`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Art approval insert returned no row.");
  return toSummary(row);
}

export async function updateArtApprovalInSupabase(
  approvalId: string,
  patch: UpdateArtApprovalInput,
): Promise<ArtApprovalSummary> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.clientName !== undefined) body.client_name = patch.clientName;
  if (patch.status !== undefined) {
    assertUpdateArtApprovalStatus(patch.status);
    body.status = patch.status;
  }
  if (patch.notes !== undefined) body.notes = patch.notes ?? null;
  if (patch.optionalProjectId !== undefined) {
    body.optional_project_id = patch.optionalProjectId ?? null;
  }
  if (patch.optionalItemId !== undefined) {
    body.optional_item_id = patch.optionalItemId ?? null;
  }
  body.updated_at = new Date().toISOString();

  if (Object.keys(body).length === 1 && body.updated_at) {
    throw new Error("No fields to update.");
  }

  const rows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?id=eq.${approvalId}&select=${approvalSelect}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Art approval not found or not updated.");
  return toSummary(row);
}

export async function deleteArtApprovalInSupabase(approvalId: string): Promise<void> {
  await request<void>(`/art_approvals?id=eq.${approvalId}`, {
    method: "DELETE",
  });
}

export async function loadAllowlistedEmailsForApproval(
  approvalId: string,
): Promise<ArtApprovalAllowlistedEmail[]> {
  const rows = await request<SupabaseRowAllowlist[]>(
    `/art_approval_allowlisted_emails?select=id,art_approval_id,email,created_at&art_approval_id=eq.${approvalId}&order=email.asc`,
  );
  return rows.map(toAllowlistRow);
}

/**
 * Replaces allowlisted emails with the given list (normalized, deduped).
 * Inserts new rows first, then removes orphans, so a failed write does not wipe the list.
 */
export async function replaceAllowlistedEmailsForApproval(
  approvalId: string,
  emails: unknown,
): Promise<ArtApprovalAllowlistedEmail[]> {
  assertAllowlistEmailArray(emails);
  const normalized = normalizeAllowlistEmails(emails);
  const current = await loadAllowlistedEmailsForApproval(approvalId);
  const currentByEmail = new Map(current.map((r) => [r.email, r]));

  const toAdd = normalized.filter((email) => !currentByEmail.has(email));
  if (toAdd.length > 0) {
    await request<SupabaseRowAllowlist[]>(
      `/art_approval_allowlisted_emails?on_conflict=art_approval_id,email`,
      {
        method: "POST",
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(
          toAdd.map((email) => ({
            art_approval_id: approvalId,
            email,
          })),
        ),
      },
    );
  }

  const keep = new Set(normalized);
  for (const row of current) {
    if (!keep.has(row.email)) {
      await request<void>(`/art_approval_allowlisted_emails?id=eq.${row.id}`, {
        method: "DELETE",
      });
    }
  }

  return loadAllowlistedEmailsForApproval(approvalId);
}

export async function getArtApprovalByReviewTokenHash(
  tokenHash: string,
): Promise<ArtApprovalSummary | undefined> {
  const rows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?select=${approvalSelect}&review_token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
  );
  const row = rows[0];
  return row ? toSummary(row) : undefined;
}

export async function markArtApprovalReadyForClient(
  approvalId: string,
): Promise<{ approval: ArtApprovalSummary; reviewToken: string }> {
  const current = await getArtApprovalFromSupabase(approvalId);
  if (!current) {
    throw new Error("Art approval not found.");
  }
  if (current.status === "approved") {
    throw new Error("Approved records cannot be marked ready for client.");
  }
  if (current.status === "ready_for_client") {
    throw new Error("Art approval is already ready for client.");
  }
  if (current.status !== "draft" && current.status !== "with_designer") {
    throw new Error("Only draft or with_designer approvals can be released to the client.");
  }

  const allowlist = await loadAllowlistedEmailsForApproval(approvalId);
  if (allowlist.length === 0) {
    throw new Error("At least one allowlisted client email is required before release.");
  }

  const reviewToken = generateReviewToken();
  const reviewTokenHash = hashReviewToken(reviewToken);
  const now = new Date().toISOString();

  const rows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?id=eq.${approvalId}&select=${approvalSelect}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "ready_for_client",
        review_token_hash: reviewTokenHash,
        ready_for_client_at: now,
        updated_at: now,
      }),
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Art approval not found while marking ready for client.");
  return { approval: toSummary(row), reviewToken };
}

export type SaveClientDecisionInput = {
  token: string;
  verifiedEmail: string;
} & ClientDecisionPayload;

export async function saveClientDecision(
  input: SaveClientDecisionInput,
): Promise<{ approval: ArtApprovalSummary; decision: ArtApprovalDecision }> {
  assertClientDecisionPayload(input);

  const tokenHash = hashReviewToken(input.token);
  const approvalRows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?select=${approvalSelect}&review_token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
  );
  const approvalRow = approvalRows[0];
  if (!approvalRow) {
    throw new Error("Invalid or expired review link.");
  }

  const approvalId = approvalRow.id;
  const status = assertStatus(approvalRow.status);
  if (status !== "ready_for_client") {
    throw new Error("This approval is not open for client review.");
  }

  const email = normalizeEmail(input.verifiedEmail);
  const allowlistRows = await request<{ email: string }[]>(
    `/art_approval_allowlisted_emails?select=email&art_approval_id=eq.${approvalId}&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  if (!allowlistRows[0]) {
    throw new Error("Email is not allowlisted for this approval.");
  }

  const round = approvalRow.round;
  const decisionBody = [
    {
      art_approval_id: approvalId,
      round,
      decision_type: input.decisionType,
      verified_email: email,
      typed_full_name: input.typedFullName.trim(),
      comment: input.comment?.trim() ? input.comment.trim() : null,
    },
  ];

  let decisionRow: SupabaseRowDecision | undefined;
  try {
    const decisionRows = await request<SupabaseRowDecision[]>(
      `/art_approval_client_decisions?select=id,art_approval_id,round,decision_type,verified_email,typed_full_name,comment,decided_at`,
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(decisionBody),
      },
    );
    decisionRow = decisionRows[0];
  } catch (err) {
    if (
      err instanceof SupabaseRequestError &&
      err.responseBody.includes("23505")
    ) {
      throw new Error(
        "A client decision has already been recorded for this review round.",
      );
    }
    throw err;
  }
  if (!decisionRow) throw new Error("Failed to persist client decision.");

  const now = new Date().toISOString();
  let nextStatus: ArtApprovalStatus;
  let nextRound = round;
  const patch: Record<string, unknown> = {
    updated_at: now,
    review_token_hash: null,
    ready_for_client_at: null,
  };

  if (input.decisionType === "approved") {
    nextStatus = "approved";
  } else {
    nextStatus = "with_designer";
    nextRound = round + 1;
    patch.round = nextRound;
  }
  patch.status = nextStatus;

  const updatedRows = await request<SupabaseRowArtApproval[]>(
    `/art_approvals?id=eq.${approvalId}&select=${approvalSelect}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    },
  );
  const updated = updatedRows[0];
  if (!updated) throw new Error("Art approval not found after decision.");

  return {
    approval: toSummary(updated),
    decision: toDecisionRow(decisionRow),
  };
}

export async function createArtApprovalFileRecordInSupabase(input: {
  artApprovalId: string;
  storagePath: string;
  originalName: string;
  contentType?: string;
  sizeBytes: number;
  uploadedBy: string;
}): Promise<ArtApprovalFile> {
  const body = [
    {
      art_approval_id: input.artApprovalId,
      storage_path: input.storagePath,
      original_name: input.originalName,
      content_type: input.contentType ?? null,
      size_bytes: input.sizeBytes,
      uploaded_by: input.uploadedBy,
    },
  ];
  const rows = await request<SupabaseRowFile[]>(
    `/art_approval_files?select=id,art_approval_id,storage_path,original_name,content_type,size_bytes,uploaded_by,created_at`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to register art approval file.");
  return toFileRow(row);
}

export async function uploadArtApprovalFile(params: {
  approvalId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType?: string;
  uploadedBy: string;
}): Promise<{ storagePath: string; file: ArtApprovalFile }> {
  const { storagePath } = await uploadArtApprovalFileToStorage({
    approvalId: params.approvalId,
    fileName: params.fileName,
    bytes: params.bytes,
    contentType: params.contentType,
  });
  const file = await createArtApprovalFileRecordInSupabase({
    artApprovalId: params.approvalId,
    storagePath,
    originalName: params.fileName,
    contentType: params.contentType,
    sizeBytes: params.bytes.byteLength,
    uploadedBy: params.uploadedBy,
  });
  return { storagePath, file };
}

export async function insertArtApprovalOtpChallenge(input: {
  artApprovalId: string;
  email: string;
  otp: string;
  expiresAtIso: string;
}): Promise<{ id: string }> {
  const normalized = normalizeEmail(input.email);
  const otpHash = await hashOtpCode(input.otp);
  const rows = await request<{ id: string }[]>(
    `/art_approval_otp_challenges?select=id`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          art_approval_id: input.artApprovalId,
          email: normalized,
          otp_hash: otpHash,
          expires_at: input.expiresAtIso,
        },
      ]),
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create OTP challenge.");
  return { id: row.id };
}

/** httpOnly cookie name for verified client review sessions (OTP passed). */
export const ART_APPROVAL_REVIEW_SESSION_COOKIE = "art_approval_review";

const OTP_SEND_COOLDOWN_MS = 60_000;
export const ART_APPROVAL_OTP_CHALLENGE_TTL_MS = 10 * 60_000;
export const ART_APPROVAL_MAX_OTP_VERIFY_ATTEMPTS = 10;
export const ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC = 60 * 60;

type SupabaseRowOtpChallenge = {
  id: string;
  art_approval_id: string;
  email: string;
  otp_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
  created_at: string;
};

export function getArtApprovalReviewSessionSecret(): string {
  const secret = process.env.ART_APPROVAL_REVIEW_SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "ART_APPROVAL_REVIEW_SESSION_SECRET must be set to a string of at least 16 characters for client review sessions.",
    );
  }
  return secret;
}

export type ArtApprovalReviewSessionPayload = {
  approvalId: string;
  email: string;
  round: number;
};

/**
 * Resolves an art approval that is open for client review using the raw URL token.
 * Returns undefined when the token does not match or the record is not in `ready_for_client`.
 */
export async function getArtApprovalReadyForClientByRawToken(
  rawToken: string,
): Promise<ArtApprovalSummary | undefined> {
  const trimmed = rawToken?.trim();
  if (!trimmed) return undefined;
  const tokenHash = hashReviewToken(trimmed);
  const approval = await getArtApprovalByReviewTokenHash(tokenHash);
  if (!approval || approval.status !== "ready_for_client") {
    return undefined;
  }
  return approval;
}

export async function isEmailAllowlistedForArtApproval(
  approvalId: string,
  normalizedEmail: string,
): Promise<boolean> {
  const email = normalizeEmail(normalizedEmail);
  if (!email.includes("@")) return false;
  const rows = await request<{ id: string }[]>(
    `/art_approval_allowlisted_emails?select=id&art_approval_id=eq.${approvalId}&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  return Boolean(rows[0]);
}

/**
 * Returns milliseconds until another OTP may be sent for this approval + email, or 0 if allowed.
 */
export async function getOtpSendCooldownRemainingMs(
  artApprovalId: string,
  email: string,
): Promise<number> {
  const normalized = normalizeEmail(email);
  const rows = await request<{ created_at: string }[]>(
    `/art_approval_otp_challenges?select=created_at&art_approval_id=eq.${artApprovalId}&email=eq.${encodeURIComponent(normalized)}&order=created_at.desc&limit=1`,
  );
  const last = rows[0];
  if (!last) return 0;
  const created = new Date(last.created_at).getTime();
  const elapsed = Date.now() - created;
  return Math.max(0, OTP_SEND_COOLDOWN_MS - elapsed);
}

export async function fetchLatestOpenOtpChallenge(
  artApprovalId: string,
  email: string,
): Promise<SupabaseRowOtpChallenge | undefined> {
  const normalized = normalizeEmail(email);
  const rows = await request<SupabaseRowOtpChallenge[]>(
    `/art_approval_otp_challenges?select=id,art_approval_id,email,otp_hash,expires_at,consumed_at,attempts,created_at&art_approval_id=eq.${artApprovalId}&email=eq.${encodeURIComponent(normalized)}&consumed_at=is.null&order=created_at.desc&limit=1`,
  );
  return rows[0];
}

export async function fetchOtpChallengeById(
  challengeId: string,
): Promise<SupabaseRowOtpChallenge | undefined> {
  const rows = await request<SupabaseRowOtpChallenge[]>(
    `/art_approval_otp_challenges?select=id,art_approval_id,email,otp_hash,expires_at,consumed_at,attempts,created_at&id=eq.${challengeId}&limit=1`,
  );
  return rows[0];
}

type ArtApprovalReviewMagicLinkEnvelope = {
  v: 1;
  cid: string;
  email: string;
  exp: number;
};

/** Signed payload for one-click email verification (consumes the same OTP challenge row). */
export function signArtApprovalReviewMagicLink(params: {
  challengeId: string;
  email: string;
  expUnixSec: number;
}): string {
  const secret = getArtApprovalOtpSecret();
  const envelope: ArtApprovalReviewMagicLinkEnvelope = {
    v: 1,
    cid: params.challengeId,
    email: normalizeEmail(params.email),
    exp: params.expUnixSec,
  };
  const payloadB64 = Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyArtApprovalReviewMagicLink(
  signed: string | null | undefined,
): ArtApprovalReviewMagicLinkEnvelope | null {
  if (!signed?.trim()) return null;
  let secret: string;
  try {
    secret = getArtApprovalOtpSecret();
  } catch {
    return null;
  }
  const dot = signed.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  if (!payloadB64 || !sig) return null;
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
      return null;
    }
  } catch {
    return null;
  }
  let parsed: ArtApprovalReviewMagicLinkEnvelope;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (parsed.v !== 1 || typeof parsed.cid !== "string") return null;
  if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

export type ArtApprovalOtpChallengeCompletableReason =
  | "ok"
  | "expired"
  | "consumed"
  | "mismatch"
  | "too_many_attempts";

export function getOtpChallengeCompletableState(
  challenge: SupabaseRowOtpChallenge,
  approval: ArtApprovalSummary,
  email: string,
): ArtApprovalOtpChallengeCompletableReason {
  const ne = normalizeEmail(email);
  if (normalizeEmail(challenge.email) !== ne) return "mismatch";
  if (challenge.art_approval_id !== approval.id) return "mismatch";
  if (challenge.consumed_at) return "consumed";
  if (challenge.attempts >= ART_APPROVAL_MAX_OTP_VERIFY_ATTEMPTS) {
    return "too_many_attempts";
  }
  const exp = new Date(challenge.expires_at).getTime();
  if (Number.isNaN(exp) || exp <= Date.now()) return "expired";
  return "ok";
}

/**
 * Consumes an open OTP challenge and returns a signed review session value (cookie payload).
 */
export async function consumeOtpChallengeAndSignReviewSession(params: {
  challengeId: string;
  approval: ArtApprovalSummary;
  email: string;
}): Promise<{ ok: true; sessionValue: string } | { ok: false }> {
  const consumed = await consumeArtApprovalOtpChallengeIfOpen(params.challengeId);
  if (!consumed) return { ok: false };
  const sessionValue = signArtApprovalReviewSession({
    approvalId: params.approval.id,
    email: normalizeEmail(params.email),
    round: params.approval.round,
  });
  return { ok: true, sessionValue };
}

export async function deleteArtApprovalOtpChallengeById(
  challengeId: string,
): Promise<void> {
  await request<void>(`/art_approval_otp_challenges?id=eq.${challengeId}`, {
    method: "DELETE",
  });
}

/**
 * Atomically increments `attempts` for a challenge row (single UPDATE … RETURNING).
 * Requires `increment_art_approval_otp_challenge_attempts` RPC (see `db/add-art-approvals.sql`).
 * Returns the new attempts value, or `null` if the row did not exist.
 */
export async function incrementArtApprovalOtpChallengeAttempts(
  challengeId: string,
): Promise<number | null> {
  const value = await request<number | null>(
    `/rpc/increment_art_approval_otp_challenge_attempts`,
    {
      method: "POST",
      body: JSON.stringify({ p_challenge_id: challengeId }),
    },
  );
  return value === null || value === undefined ? null : value;
}

/**
 * Sets `consumed_at` only when still null; returns the updated row if consumed, else empty.
 * Requires `consume_art_approval_otp_challenge_if_open` RPC (see `db/add-art-approvals.sql`).
 */
export async function consumeArtApprovalOtpChallengeIfOpen(
  challengeId: string,
): Promise<SupabaseRowOtpChallenge | undefined> {
  const data = await request<
    SupabaseRowOtpChallenge[] | SupabaseRowOtpChallenge
  >(`/rpc/consume_art_approval_otp_challenge_if_open`, {
    method: "POST",
    body: JSON.stringify({ p_challenge_id: challengeId }),
  });
  if (Array.isArray(data)) {
    return data[0];
  }
  if (data && typeof data === "object" && "id" in data) {
    return data as SupabaseRowOtpChallenge;
  }
  return undefined;
}

export function signArtApprovalReviewSession(
  payload: ArtApprovalReviewSessionPayload,
  maxAgeSec: number = ART_APPROVAL_REVIEW_SESSION_MAX_AGE_SEC,
): string {
  const secret = getArtApprovalReviewSessionSecret();
  const envelope = {
    v: 1 as const,
    approvalId: payload.approvalId,
    email: payload.email,
    round: payload.round,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const payloadB64 = Buffer.from(JSON.stringify(envelope), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyArtApprovalReviewSession(
  cookieValue: string | undefined,
): ArtApprovalReviewSessionPayload | null {
  if (!cookieValue?.trim()) return null;
  let secret: string;
  try {
    secret = getArtApprovalReviewSessionSecret();
  } catch {
    return null;
  }
  const dot = cookieValue.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!payloadB64 || !sig) return null;
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
      return null;
    }
  } catch {
    return null;
  }
  let parsed: {
    v: number;
    approvalId: string;
    email: string;
    round: number;
    exp: number;
  };
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (parsed.v !== 1 || typeof parsed.approvalId !== "string") return null;
  if (typeof parsed.email !== "string" || typeof parsed.round !== "number") return null;
  if (typeof parsed.exp !== "number") return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    approvalId: parsed.approvalId,
    email: normalizeEmail(parsed.email),
    round: parsed.round,
  };
}

