import { requireAdmin, getServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireAdmin(req.headers.get("Authorization"));
    const { userId, approved, role } = await req.json();

    if (!userId || typeof approved !== "boolean") {
      return new Response(JSON.stringify({ error: "userId and approved are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = getServiceClient();

    if (approved) {
      // Approve user
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          approved: true,
          approved_by: caller.userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) throw new Error(profileError.message);

      // Optionally set role
      if (role && ["admin", "analyst", "viewer"].includes(role)) {
        await admin
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
      }

      // Get user email and name to send notification
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (profile?.email) {
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "access-approved",
              recipientEmail: profile.email,
              idempotencyKey: `access-approved-${userId}`,
              templateData: { name: profile.full_name || undefined },
            },
          });
        } catch (emailErr) {
          console.error("Failed to send approval email", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Reject — delete user entirely
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error(deleteError.message);

      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    const status = e.status || 500;
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
