import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/admin";
  const safeNext = next.startsWith("/") ? next : "/admin";
  const isClientReview = safeNext.startsWith("/review/");

  const redirectWithError = (error: string) => {
    if (isClientReview) {
      const dest = new URL(`${requestUrl.origin}${safeNext}`);
      dest.searchParams.set("error", error);
      return NextResponse.redirect(dest);
    }
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error)}`,
    );
  };

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirectWithError(error.message);
      }
    } catch {
      return redirectWithError("callback_failed");
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}
