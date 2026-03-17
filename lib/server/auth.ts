import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Get the current user from the request session (for API routes).
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if an email is in the approved_account_managers allowlist.
 * Uses service role to read from public.approved_account_managers.
 */
export async function isEmailApproved(email: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const res = await fetch(
    `${url}/rest/v1/approved_account_managers?email=eq.${encodeURIComponent(normalized)}&select=email`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as { email: string }[];
  return Array.isArray(rows) && rows.length > 0;
}
