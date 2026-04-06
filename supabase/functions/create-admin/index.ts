import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "planeteexpress2125@gmail.com", password: "admin123", full_name: "Антон Лощилов", role: "admin" },
    { email: "loschilovanton@gmail.com", password: "analyst123", full_name: "Антон Лощилов (аналитик)", role: "analyst" },
    { email: "viewer@example.com", password: "viewer123", full_name: "Просмотр", role: "viewer" },
    { email: "shesterov@gmail.com", password: "analyst123", full_name: "Шестеров", role: "analyst" },
  ];

  const results = [];

  for (const u of users) {
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

    // Update role from default 'viewer' to target role
    if (u.role !== "viewer") {
      await supabaseAdmin
        .from("user_roles")
        .update({ role: u.role })
        .eq("user_id", data.user.id);
    }

    results.push({ email: u.email, user_id: data.user.id, role: u.role });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
