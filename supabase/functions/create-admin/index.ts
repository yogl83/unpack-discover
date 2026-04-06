import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@hse.ru",
    password: "admin123",
    email_confirm: true,
    user_metadata: { full_name: "Администратор" },
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  // Assign admin role
  await supabaseAdmin.from("user_roles").update({ role: "admin" }).eq("user_id", data.user.id);

  return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
