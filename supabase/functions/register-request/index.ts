import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "email, password и full_name обязательны" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Пароль должен быть не менее 6 символов" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const exists = existingUsers?.users?.some((u) => u.email === email);
    if (exists) {
      return new Response(JSON.stringify({ error: "Пользователь с таким email уже существует" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user (email auto-confirmed so they can login once approved)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profile is created by trigger with approved=false by default
    await supabaseAdmin
      .from("profiles")
      .update({ full_name, email })
      .eq("id", userData.user.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Send "registration received" email to the applicant
    try {
      const emailRes = await fetch(
        `${supabaseUrl}/functions/v1/send-transactional-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            templateName: "registration-received",
            recipientEmail: email,
            idempotencyKey: `reg-received-${userData.user.id}`,
            templateData: { name: full_name },
          }),
        }
      );
      if (!emailRes.ok) {
        console.error("Failed to send registration email", emailRes.status, await emailRes.text());
      }
    } catch (emailErr) {
      console.error("Failed to send registration email", emailErr);
    }

    // Notify all admins about the new registration request
    try {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        // Fetch admin profiles to get emails
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", adminIds);

        if (adminProfiles) {
          for (const admin of adminProfiles) {
            if (!admin.email) continue;
            try {
              await fetch(
                `${supabaseUrl}/functions/v1/send-transactional-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    templateName: "new-registration-request",
                    recipientEmail: admin.email,
                    idempotencyKey: `new-reg-admin-${userData.user.id}-${admin.id}`,
                    templateData: {
                      adminName: admin.full_name,
                      applicantName: full_name,
                      applicantEmail: email,
                    },
                  }),
                }
              );
            } catch (adminEmailErr) {
              console.error("Failed to send admin notification", admin.email, adminEmailErr);
            }
          }
        }
      }
    } catch (adminNotifyErr) {
      console.error("Failed to notify admins", adminNotifyErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
