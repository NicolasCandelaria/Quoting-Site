import type {
  ArtApprovalDetail,
  ArtApprovalSummary,
  ClientDecisionPayload,
  CreateArtApprovalInput,
  RequestOtpPayload,
  UpdateArtApprovalAllowlistInput,
  UpdateArtApprovalInput,
  VerifyOtpPayload,
} from "@/lib/art-approvals/models";

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    const message =
      (body as { error?: string }).error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function fetchArtApprovals(): Promise<ArtApprovalSummary[]> {
  const response = await fetch("/api/art-approvals", { cache: "no-store" });
  const body = await readJson<{ approvals: ArtApprovalSummary[] }>(response);
  return body.approvals;
}

export async function fetchArtApproval(
  approvalId: string,
): Promise<ArtApprovalDetail | null> {
  const response = await fetch(`/api/art-approvals/${approvalId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function createArtApproval(
  input: CreateArtApprovalInput,
): Promise<ArtApprovalDetail> {
  const response = await fetch("/api/art-approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function updateArtApproval(
  approvalId: string,
  input: UpdateArtApprovalInput,
): Promise<ArtApprovalDetail> {
  const response = await fetch(`/api/art-approvals/${approvalId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function markArtApprovalReadyForClient(
  approvalId: string,
): Promise<ArtApprovalDetail> {
  const response = await fetch(`/api/art-approvals/${approvalId}/ready`, {
    method: "POST",
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function updateArtApprovalAllowlist(
  approvalId: string,
  input: UpdateArtApprovalAllowlistInput,
): Promise<ArtApprovalDetail> {
  const response = await fetch(`/api/art-approvals/${approvalId}/allowlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function requestArtApprovalOtp(
  token: string,
  input: RequestOtpPayload,
): Promise<{ ok: true }> {
  const response = await fetch(`/api/art-approvals/review/${token}/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ ok: true }>(response);
}

export async function verifyArtApprovalOtp(
  token: string,
  input: VerifyOtpPayload,
): Promise<{ ok: true }> {
  const response = await fetch(`/api/art-approvals/review/${token}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ ok: true }>(response);
}

export async function submitArtApprovalDecision(
  token: string,
  input: ClientDecisionPayload,
): Promise<{ approval: ArtApprovalDetail }> {
  const response = await fetch(`/api/art-approvals/review/${token}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ approval: ArtApprovalDetail }>(response);
}
