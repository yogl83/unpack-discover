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
 * Decode JWT payload without verification (edge runtime handles signature check).
 */
function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw { status: 401, message: "Malformed token" };
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  return payload;
}

/**
 * Validate that the request comes from an authenticated admin user.
 * Throws a structured error { status, message } on failure.
 */
export async function requireAdmin(authHeader: string | null): Promise<CallerInfo> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Authorization header missing or malformed" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  let claims: Record<string, any>;
  try {
    claims = decodeJwtPayload(token);
  } catch {
    throw { status: 401, message: "Invalid token format" };
  }

  const userId = claims.sub;
  const email = claims.email;

  if (!userId) {
    throw { status: 401, message: "Token missing user ID" };
  }

  // Check token expiration
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    throw { status: 401, message: "Token expired" };
  }

  // Check admin role via service role client (bypasses RLS)
  const adminClient = getServiceClient();
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    throw { status: 403, message: "Caller is not an admin" };
  }

  return { userId, email };
}

/** Create a Supabase admin client with service role key. */
export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
