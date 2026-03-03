import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorizedResponse(message?: string) {
  return new NextResponse(
    message ?? "Authentication required for admin access.",
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"',
      },
    },
  );
}

function normalizeEnv(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getAdminCredentials() {
  // Primary expected keys.
  const username = normalizeEnv(process.env.ADMIN_BASIC_AUTH_USERNAME);
  const password = normalizeEnv(process.env.ADMIN_BASIC_AUTH_PASSWORD);

  if (username && password) {
    return { username, password };
  }

  // Fallback keys to tolerate common dashboard naming mistakes.
  const fallbackUsername = normalizeEnv(process.env.ADMIN_USERNAME);
  const fallbackPassword = normalizeEnv(process.env.ADMIN_PASSWORD);

  return {
    username: username || fallbackUsername,
    password: password || fallbackPassword,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const { username, password } = getAdminCredentials();

  if (!username || !password) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return unauthorizedResponse(
      "Admin auth is configured incorrectly. Set ADMIN_BASIC_AUTH_USERNAME and ADMIN_BASIC_AUTH_PASSWORD (or ADMIN_USERNAME / ADMIN_PASSWORD) in Vercel env vars, then redeploy.",
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice(6);

  let decodedCredentials = "";

  try {
    decodedCredentials = atob(base64Credentials);
  } catch {
    return unauthorizedResponse();
  }

  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex === -1) {
    return unauthorizedResponse();
  }

  const inputUsername = decodedCredentials.slice(0, separatorIndex);
  const inputPassword = decodedCredentials.slice(separatorIndex + 1);

  if (inputUsername !== username || inputPassword !== password) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
