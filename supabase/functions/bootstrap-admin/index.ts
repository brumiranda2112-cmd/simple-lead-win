import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_EMAIL = "Khronos@crm.ia";
const DEFAULT_PASSWORD = "Khronos.crm";
const DEFAULT_NAME = "Khronos Master";

const SUPER_ADMIN_EMAIL = "bruno.fontes@khronos.ia";
const SUPER_ADMIN_PASSWORD = "Brunorcmg123@";
const SUPER_ADMIN_NAME = "Bruno Fontes";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { users } } = await adminClient.auth.admin.listUsers();

    // Ensure master account exists
    const existingDefault = users?.find(u => u.email?.toLowerCase() === DEFAULT_EMAIL.toLowerCase());
    if (!existingDefault) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { name: DEFAULT_NAME },
      });

      if (createError) {
        console.error("Error creating default admin:", createError.message);
      } else {
        await adminClient.from("user_roles").upsert(
          { user_id: newUser.user.id, role: "admin" },
          { onConflict: "user_id,role" }
        );
      }
    } else {
      const { data: existingRole } = await adminClient
        .from("user_roles").select("id")
        .eq("user_id", existingDefault.id).eq("role", "admin").limit(1);
      if (!existingRole || existingRole.length === 0) {
        await adminClient.from("user_roles").upsert(
          { user_id: existingDefault.id, role: "admin" },
          { onConflict: "user_id,role" }
        );
      }
    }

    // Ensure super admin account exists
    const existingSuper = users?.find(u => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    if (!existingSuper) {
      const { data: superUser, error: superError } = await adminClient.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { name: SUPER_ADMIN_NAME },
      });

      if (superError) {
        console.error("Error creating super admin:", superError.message);
      } else {
        await adminClient.from("user_roles").upsert(
          { user_id: superUser.user.id, role: "admin" },
          { onConflict: "user_id,role" }
        );
      }
    } else {
      const { data: existingRole } = await adminClient
        .from("user_roles").select("id")
        .eq("user_id", existingSuper.id).eq("role", "admin").limit(1);
      if (!existingRole || existingRole.length === 0) {
        await adminClient.from("user_roles").upsert(
          { user_id: existingSuper.id, role: "admin" },
          { onConflict: "user_id,role" }
        );
      }
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
