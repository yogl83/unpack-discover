import { requireAdmin, getServiceClient } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

const ALLOWED_ROLES = ["admin", "analyst", "viewer"] as const;

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

function validatePayload(body: unknown): CreateUserPayload {
  if (!body || typeof body !== "object") {
    throw { status: 400, message: "Request body must be a JSON object" };
  }

  const { email, password, full_name, role } = body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw { status: 400, message: "Valid email is required" };
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw { status: 400, message: "Password must be at least 6 characters" };
  }
  if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
    throw { status: 400, message: "full_name is required" };
  }
  if (!role || typeof role !== "string" || !ALLOWED_ROLES.includes(role as any)) {
    throw { status: 400, message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` };
  }

  return { email: email.trim(), password, full_name: full_name.trim(), role };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    await requireAdmin(req.headers.get("Authorization"));

    const rawBody = await parseJsonBody(req);

    // Support both { users: [...] } and single object
    let usersToCreate: CreateUserPayload[];
    const bodyObj = rawBody as Record<string, unknown>;
    if (bodyObj?.users && Array.isArray(bodyObj.users)) {
      usersToCreate = bodyObj.users.map((u: unknown) => validatePayload(u));
    } else {
      usersToCreate = [validatePayload(rawBody)];
    }

    const supabaseAdmin = getServiceClient();
    const results = [];

    for (const u of usersToCreate) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (error) {
        results.push({ email: u.email, error: error.message });
        continue;
      }

      // Update role if not default viewer
      if (u.role !== "viewer") {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: u.role })
          .eq("user_id", data.user.id);
      }

      results.push({ email: u.email, user_id: data.user.id, role: u.role });
    }

    return successResponse({ results }, origin);
  } catch (err) {
    return errorResponse(err, origin);
  }
});
