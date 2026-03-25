import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_EMAIL = "Khronos@crm.ia";
const DEFAULT_PASSWORD = "Khronos.crm";
const DEFAULT_NAME = "Administrador";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // GET = check if default admin exists, auto-create if not
    if (req.method === "GET") {
      const { data: existingAdmins } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      const hasAdmin = !!(existingAdmins && existingAdmins.length > 0);

      if (!hasAdmin) {
        // Auto-create the default admin account
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { name: DEFAULT_NAME },
        });

        if (createError) {
          // User might already exist in auth but not in user_roles
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const existing = users?.find(u => u.email === DEFAULT_EMAIL);
          if (existing) {
            // Ensure role exists
            await adminClient.from("user_roles").upsert(
              { user_id: existing.id, role: "admin" },
              { onConflict: "user_id,role" }
            );
            return new Response(JSON.stringify({ has_admin: true, auto_created: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ has_admin: false, error: createError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

        return new Response(JSON.stringify({ has_admin: true, auto_created: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ has_admin: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST = manual admin creation (kept for setup page compatibility)
    const { data: existingAdmins } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(JSON.stringify({ error: "Um administrador já existe. Use o painel admin para criar mais usuários." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
