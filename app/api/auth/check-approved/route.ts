import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailApproved } from "@/lib/server/auth";

/**
 * Returns 200 if the current request has a valid session and the user's email
 * is in approved_account_managers. Returns 403 otherwise.
 * Used by middleware to enforce the allowlist on the edge.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return NextResponse.json({ approved: false }, { status: 403 });
    }
    const approved = await isEmailApproved(user.email);
    if (!approved) {
      return NextResponse.json({ approved: false }, { status: 403 });
    }
    return NextResponse.json({ approved: true });
  } catch {
    return NextResponse.json({ approved: false }, { status: 403 });
  }
}
