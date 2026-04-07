import { requireAdmin, getServiceClient } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

const ALLOWED_ROLES = ["admin", "analyst", "viewer"] as const;

interface UpdateRolePayload {
  userId: string;
  role: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    const caller = await requireAdmin(req.headers.get("Authorization"));
    const body = await parseJsonBody<UpdateRolePayload>(req);

    const { userId, role } = body;
    if (!userId || typeof userId !== "string") {
      throw { status: 400, message: "userId is required" };
    }
    if (!role || !ALLOWED_ROLES.includes(role as any)) {
      throw { status: 400, message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` };
    }

    // Prevent admin from demoting themselves
    if (userId === caller.userId && role !== "admin") {
      throw { status: 400, message: "Cannot change your own admin role" };
    }

    const admin = getServiceClient();
    const { error } = await admin
      .from("user_roles")
      .update({ role: role as any })
      .eq("user_id", userId);

    if (error) {
      console.error("update-user-role DB error:", error.message);
      throw { status: 500, message: "Failed to update role" };
    }

    return successResponse({ success: true, userId, role }, origin);
  } catch (err) {
    return errorResponse(err, origin);
  }
});
