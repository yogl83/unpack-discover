import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Validate caller is authenticated admin. Returns caller user_id. */
async function validateAdminCaller(authHeader: string | null): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Authorization header missing or malformed" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    throw { status: 403, message: "Caller is not an admin" };
  }

  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const callerId = await validateAdminCaller(req.headers.get("Authorization"));

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw { status: 400, message: "Invalid JSON body" };
    }

    const userId = body?.userId;
    if (!userId || typeof userId !== "string") {
      throw { status: 400, message: "userId is required" };
    }

    if (userId === callerId) {
      throw { status: 400, message: "Cannot delete yourself" };
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete from auth.users — triggers/cascades will clean up profiles & user_roles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      throw { status: 500, message: error.message };
    }

    // Explicit cleanup in case cascades are not set up
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
