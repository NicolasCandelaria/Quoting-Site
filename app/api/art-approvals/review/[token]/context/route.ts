import { NextResponse } from "next/server";

import {
  ART_APPROVAL_REVIEW_SESSION_COOKIE,
  getArtApprovalFromSupabase,
  getArtApprovalReadyForClientByRawToken,
  getArtApprovalReviewSessionSecret,
  verifyArtApprovalReviewSession,
} from "@/lib/server/art-approvals";
import { createSignedArtApprovalDownloadUrl } from "@/lib/server/supabase-storage";
import { isSupabaseConfigured } from "@/lib/server/supabase";

function readReviewSessionCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  const sessionCookie = cookieHeader
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ART_APPROVAL_REVIEW_SESSION_COOKIE}=`));
  const eq = sessionCookie?.indexOf("=");
  const rawCookieEncoded =
    sessionCookie && eq !== undefined && eq >= 0 ? sessionCookie.slice(eq + 1) : undefined;
  try {
    return rawCookieEncoded ? decodeURIComponent(rawCookieEncoded) : undefined;
  } catch {
    return rawCookieEncoded;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service is temporarily unavailable." }, { status: 500 });
  }

  try {
    getArtApprovalReviewSessionSecret();
  } catch {
    return NextResponse.json({ error: "Service is temporarily unavailable." }, { status: 500 });
  }

  const { token } = await context.params;
  const approval = await getArtApprovalReadyForClientByRawToken(token);
  const rawCookie = readReviewSessionCookie(request);
  const session = verifyArtApprovalReviewSession(rawCookie);

  if (!approval || !session || session.approvalId !== approval.id || session.round !== approval.round) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const detail = await getArtApprovalFromSupabase(approval.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const signedTtlSec = 3600;
  const files = await Promise.all(
    detail.files.map(async (f) => {
      const downloadUrl = await createSignedArtApprovalDownloadUrl(f.storagePath, signedTtlSec);
      return {
        id: f.id,
        originalName: f.originalName,
        ...(downloadUrl ? { downloadUrl } : {}),
      };
    }),
  );

  return NextResponse.json({
    approval: {
      title: detail.title,
      clientName: detail.clientName,
      round: detail.round,
      status: detail.status,
      files,
      formFields: {
        optionalProjectId: detail.optionalProjectId ?? null,
        optionalItemId: detail.optionalItemId ?? null,
      },
    },
  });
}
