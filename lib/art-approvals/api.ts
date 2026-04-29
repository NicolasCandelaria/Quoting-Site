import type {
  ArtApproval,
  ArtApprovalDecision,
  ArtApprovalDetail,
  ArtApprovalFile,
  ArtApprovalReviewContextResponse,
  ClientDecisionPayload,
  CreateArtApprovalInput,
  UpdateArtApprovalInput,
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

export async function fetchArtApprovals(): Promise<ArtApproval[]> {
  const response = await fetch("/api/art-approvals", { cache: "no-store" });
  const body = await readJson<{ approvals: ArtApproval[] }>(response);
  return body.approvals;
}

export async function createArtApproval(input: CreateArtApprovalInput): Promise<ArtApproval> {
  const response = await fetch("/api/art-approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readJson<{ approval: ArtApproval }>(response);
  return body.approval;
}

export async function fetchArtApproval(approvalId: string): Promise<ArtApprovalDetail | null> {
  const response = await fetch(`/api/art-approvals/${approvalId}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function updateArtApproval(
  approvalId: string,
  patch: UpdateArtApprovalInput,
): Promise<ArtApprovalDetail> {
  const response = await fetch(`/api/art-approvals/${approvalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function deleteArtApproval(approvalId: string): Promise<void> {
  const response = await fetch(`/api/art-approvals/${approvalId}`, {
    method: "DELETE",
  });
  if (response.status === 204) return;
  const body = (await response.json()) as { error?: string };
  throw new Error(body.error ?? `Request failed (${response.status})`);
}

export async function markArtApprovalReadyForClient(approvalId: string): Promise<{
  approval: ArtApprovalDetail;
  reviewToken: string;
}> {
  const response = await fetch(`/api/art-approvals/${approvalId}/ready`, {
    method: "POST",
  });
  return readJson(response);
}

export async function uploadArtApprovalFile(
  approvalId: string,
  file: File,
): Promise<ArtApprovalFile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/art-approvals/${approvalId}/files`, {
    method: "POST",
    body: formData,
  });
  const body = await readJson<{ file: ArtApprovalFile }>(response);
  return body.file;
}

export async function updateArtApprovalAllowlist(
  approvalId: string,
  emails: string[],
): Promise<ArtApprovalDetail> {
  const response = await fetch(`/api/art-approvals/${approvalId}/allowlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
  const body = await readJson<{ approval: ArtApprovalDetail }>(response);
  return body.approval;
}

export async function requestArtApprovalOtp(token: string, email: string): Promise<void> {
  const response = await fetch(
    `/api/art-approvals/review/${encodeURIComponent(token)}/otp/request`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    },
  );
  await readJson<{ ok: boolean }>(response);
}

export async function verifyArtApprovalOtp(
  token: string,
  email: string,
  code: string,
): Promise<void> {
  const response = await fetch(
    `/api/art-approvals/review/${encodeURIComponent(token)}/otp/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include",
    },
  );
  await readJson<{ ok: boolean }>(response);
}

export async function fetchArtApprovalReviewContext(
  token: string,
): Promise<ArtApprovalReviewContextResponse> {
  const response = await fetch(
    `/api/art-approvals/review/${encodeURIComponent(token)}/context`,
    { credentials: "include", cache: "no-store" },
  );
  const body = (await response.json()) as ArtApprovalReviewContextResponse & { error?: string };
  if (!response.ok) {
    const message = body.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function submitArtApprovalDecision(
  token: string,
  payload: ClientDecisionPayload,
): Promise<{ approval: ArtApproval; decision: ArtApprovalDecision }> {
  const response = await fetch(
    `/api/art-approvals/review/${encodeURIComponent(token)}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    },
  );
  return readJson(response);
}
