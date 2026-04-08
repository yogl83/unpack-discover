import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    if (req.method !== "POST") {
      throw { status: 405, message: "Method not allowed" };
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if any admin already exists — if so, refuse
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      throw { status: 500, message: "Failed to check existing admins" };
    }

    if (existingAdmins && existingAdmins.length > 0) {
      throw { status: 403, message: "Bootstrap disabled: an admin already exists" };
    }

    // Parse and validate input
    const body = await parseJsonBody(req) as Record<string, unknown>;
    const { email, password, full_name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw { status: 400, message: "Valid email is required" };
    }
    if (!password || typeof password !== "string" || (password as string).length < 8) {
      throw { status: 400, message: "Password must be at least 8 characters" };
    }
    if (!full_name || typeof full_name !== "string" || (full_name as string).trim().length === 0) {
      throw { status: 400, message: "Full name is required" };
    }

    // Create the user with email auto-confirmed
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: (email as string).trim(),
      password: password as string,
      email_confirm: true,
      user_metadata: { full_name: (full_name as string).trim() },
    });

    if (createError) {
      throw { status: 400, message: createError.message };
    }

    // Set role to admin (the trigger already created a 'viewer' row)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", userData.user.id);

    if (roleError) {
      throw { status: 500, message: "User created but failed to set admin role: " + roleError.message };
    }

    return successResponse(
      { message: "Admin created successfully", email },
      origin,
    );
  } catch (err) {
    return errorResponse(err, origin);
  }
});
