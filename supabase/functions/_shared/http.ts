/**
 * Shared HTTP response helpers for Edge Functions.
 * Ensures consistent response shape and safe error handling.
 */
import { getCorsHeaders } from "./cors.ts";

export function jsonResponse(
  body: unknown,
  status: number,
  requestOrigin?: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      "Content-Type": "application/json",
    },
  });
}

export function successResponse(data: unknown, requestOrigin?: string | null): Response {
  return jsonResponse(data, 200, requestOrigin);
}

export function errorResponse(
  err: unknown,
  requestOrigin?: string | null,
): Response {
  const status = (err as any)?.status || 500;
  const message = (err as any)?.message || "Internal server error";
  return jsonResponse({ error: message }, status, requestOrigin);
}

/**
 * Parse JSON body safely. Throws { status: 400 } on failure.
 */
export async function parseJsonBody<T = unknown>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw { status: 400, message: "Invalid JSON body" };
  }
}
