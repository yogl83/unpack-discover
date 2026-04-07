/**
 * Shared auth helpers for Edge Functions.
 * Validates caller identity and admin role server-side.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface CallerInfo {
  userId: string;
  email: string | undefined;
}

/**
 * Validate that the request comes from an authenticated admin user.
 * Throws a structured error { status, message } on failure.
 */
export async function requireAdmin(authHeader: string | null): Promise<CallerInfo> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Authorization header missing or malformed" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  // Check admin role via service role client (bypasses RLS)
  const adminClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    throw { status: 403, message: "Caller is not an admin" };
  }

  return { userId: user.id, email: user.email };
}

/** Create a Supabase admin client with service role key. */
export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
