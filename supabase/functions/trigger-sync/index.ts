/**
 * trigger-sync: External trigger for Google Sheets sync.
 * Supports two auth modes:
 * 1. Admin Bearer token (same as manual sync)
 * 2. Machine token via SYNC_API_TOKEN secret (for bots/cron)
 *
 * POST /trigger-sync
 * Body: { action?: "import"|"export", tables?: string[] }
 * If no body/action provided, defaults to "import" with settings from sync_settings.
 */
import { requireAdmin, getServiceClient } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/http.ts";

async function authenticateCaller(authHeader: string | null): Promise<{ userId?: string; mode: "admin" | "token" }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Authorization header required" };
  }

  const token = authHeader.replace("Bearer ", "");

  // Check machine token first
  const syncToken = Deno.env.get("SYNC_API_TOKEN");
  if (syncToken && token === syncToken) {
    return { mode: "token" };
  }

  // Fall back to admin auth
  const caller = await requireAdmin(authHeader);
  return { userId: caller.userId, mode: "admin" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    const caller = await authenticateCaller(req.headers.get("Authorization"));
    const adminClient = getServiceClient();

    // Load settings
    const { data: settings } = await adminClient
      .from("sync_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings?.spreadsheet_id) {
      throw { status: 400, message: "No spreadsheet_id configured in sync settings" };
    }

    if (!settings.enabled) {
      throw { status: 400, message: "Google Sheets sync is disabled in settings" };
    }

    // Parse optional body
    let action = "import";
    let tables: string[] = [];
    try {
      const body = await req.json();
      if (body.action === "export" || body.action === "import") action = body.action;
      if (Array.isArray(body.tables)) tables = body.tables;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Use default tables from settings if none specified
    if (tables.length === 0 && settings.default_tables?.length > 0) {
      tables = settings.default_tables;
    }

    // Call the main sync function internally via Supabase
    // We use service role to invoke so it passes admin check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        action,
        spreadsheet_id: settings.spreadsheet_id,
        tables,
      }),
    });

    const syncData = await syncRes.json();

    if (!syncRes.ok) {
      throw { status: syncRes.status, message: syncData?.error || "Sync failed" };
    }

    // Update sync log triggered_by
    if (syncData.success) {
      // Update the most recent log entry to reflect trigger source
      const { data: lastLog } = await adminClient
        .from("sync_log")
        .select("id")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (lastLog) {
        await adminClient
          .from("sync_log")
          .update({
            triggered_by: caller.mode === "token" ? "bot" : "api_trigger",
            trigger_user_id: caller.userId || null,
          })
          .eq("id", lastLog.id);
      }
    }

    return successResponse({
      success: true,
      trigger: caller.mode,
      action,
      result: syncData.result,
    }, origin);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return errorResponse(err, origin);
    }
    console.error("trigger-sync error:", err);
    return errorResponse({ status: 500, message: "Internal error" }, origin);
  }
});
