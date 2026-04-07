import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = ["admin", "analyst", "viewer"] as const;

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

/** Validate caller is authenticated admin. Returns user_id or throws. */
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

  // Check admin role via service role client (bypasses RLS)
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate & authorize caller
    await validateAdminCaller(req.headers.get("Authorization"));

    // 2. Parse & validate payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw { status: 400, message: "Invalid JSON body" };
    }

    // Support both { users: [...] } array and single user object
    let usersToCreate: CreateUserPayload[];
    const bodyObj = body as Record<string, unknown>;
    if (bodyObj?.users && Array.isArray(bodyObj.users)) {
      usersToCreate = bodyObj.users.map((u: unknown) => validatePayload(u));
    } else {
      usersToCreate = [validatePayload(body)];
    }

    // 3. Create users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    return new Response(JSON.stringify({ results }), {
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
