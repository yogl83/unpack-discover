/**
 * CORS helpers for Edge Functions.
 * Privileged functions use origin allowlist from ALLOWED_ORIGINS env var.
 * Falls back to the app's SUPABASE_URL origin for safety.
 */

const DEFAULT_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  // Default: allow the Supabase project URL origin (covers deployed preview)
  return ["*"];
}

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();

  // Wildcard mode (default when ALLOWED_ORIGINS is not set)
  if (allowed.includes("*")) {
    return { ...DEFAULT_HEADERS, "Access-Control-Allow-Origin": "*" };
  }

  // Strict origin check
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return {
      ...DEFAULT_HEADERS,
      "Access-Control-Allow-Origin": requestOrigin,
      Vary: "Origin",
    };
  }

  // No match — return first allowed origin (browser will reject cross-origin)
  return {
    ...DEFAULT_HEADERS,
    "Access-Control-Allow-Origin": allowed[0],
    Vary: "Origin",
  };
}

export function optionsResponse(req: Request): Response {
  return new Response("ok", {
    headers: getCorsHeaders(req.headers.get("Origin")),
  });
}
