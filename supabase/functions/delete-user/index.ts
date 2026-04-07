import { requireAdmin, getServiceClient } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    const caller = await requireAdmin(req.headers.get("Authorization"));

    const body = await parseJsonBody<{ userId?: string }>(req);

    const userId = body?.userId;
    if (!userId || typeof userId !== "string") {
      throw { status: 400, message: "userId is required" };
    }

    if (userId === caller.userId) {
      throw { status: 400, message: "Cannot delete yourself" };
    }

    const supabaseAdmin = getServiceClient();

    // Delete from auth.users — triggers/cascades clean up profiles & user_roles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("delete-user auth error:", error.message);
      throw { status: 500, message: "Failed to delete user" };
    }

    // Explicit cleanup in case cascades are not set up
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    return successResponse({ success: true }, origin);
  } catch (err) {
    return errorResponse(err, origin);
  }
});
