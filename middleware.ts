import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const loginUrl = `${url.origin}/admin/login`;
  const loginWithNext = `${loginUrl}?next=${encodeURIComponent(pathname)}`;

  try {
    const { supabase, response } = await createClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirect = NextResponse.redirect(loginWithNext);
      response.cookies.getAll().forEach((cookie) =>
        redirect.cookies.set(cookie.name, cookie.value)
      );
      return redirect;
    }

    const checkUrl = new URL("/api/auth/check-approved", url.origin);
    const checkRes = await fetch(checkUrl.toString(), {
      headers: {
        Cookie: request.headers.get("Cookie") ?? "",
      },
    });

    if (!checkRes.ok) {
      const redirect = NextResponse.redirect(
        `${loginUrl}?error=not-approved&next=${encodeURIComponent(pathname)}`
      );
      response.cookies.getAll().forEach((cookie) =>
        redirect.cookies.set(cookie.name, cookie.value)
      );
      return redirect;
    }

    return response;
  } catch {
    return NextResponse.redirect(loginWithNext);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
