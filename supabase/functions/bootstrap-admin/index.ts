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

    // Always ensure the default admin account exists
    // Check if the default admin user exists in auth
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingDefault = users?.find(u => u.email?.toLowerCase() === DEFAULT_EMAIL.toLowerCase());

    if (!existingDefault) {
      // Create the default admin account
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { name: DEFAULT_NAME },
      });

      if (createError) {
        console.error("Error creating default admin:", createError.message);
        return new Response(JSON.stringify({ has_admin: false, error: createError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign admin role
      await adminClient.from("user_roles").upsert(
        { user_id: newUser.user.id, role: "admin" },
        { onConflict: "user_id,role" }
      );

      return new Response(JSON.stringify({ has_admin: true, auto_created: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User exists in auth, ensure role exists
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", existingDefault.id)
      .eq("role", "admin")
      .limit(1);

    if (!existingRole || existingRole.length === 0) {
      await adminClient.from("user_roles").upsert(
        { user_id: existingDefault.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    return new Response(JSON.stringify({ has_admin: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
