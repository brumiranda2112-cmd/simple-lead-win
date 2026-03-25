import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "khronos@crm.ia";
const SUPER_ADMIN_EMAIL = "bruno.fontes@khronos.ia";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: caller } } = await adminClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerEmail = caller.email?.toLowerCase() || "";
    const isMaster = callerEmail === MASTER_EMAIL;
    const isSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;

    // Check admin role (master and super admin bypass)
    if (!isMaster && !isSuperAdmin) {
      const { data: callerRoles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
      const isAdmin = callerRoles?.some(r => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get caller's tenant_id for propagation
    const { data: callerProfile } = await adminClient.from("profiles").select("tenant_id").eq("id", caller.id).single();
    const callerTenantId = callerProfile?.tenant_id || null;

    const { action, ...body } = await req.json();

    if (action === "create_user") {
      const { email, password, name, role, responsible_key, tenant_id: explicitTenantId } = body;

      // Prevent duplicate emails
      const emailLower = email.toLowerCase();
      if (emailLower === MASTER_EMAIL || emailLower === SUPER_ADMIN_EMAIL) {
        return new Response(JSON.stringify({ error: "Este email não pode ser utilizado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine tenant_id:
      // - If master is creating (Setup page), the new user IS the tenant root → tenant_id = their own id
      // - If a regular admin creates, propagate their tenant_id
      // - If super admin passes explicit tenant_id, use that
      let finalTenantId: string;
      if (isMaster) {
        finalTenantId = newUser.user.id; // New admin is their own tenant root
      } else if (isSuperAdmin && explicitTenantId) {
        finalTenantId = explicitTenantId;
      } else {
        finalTenantId = callerTenantId || caller.id;
      }

      // Update profile with tenant_id and responsible_key
      const profileUpdate: Record<string, unknown> = { tenant_id: finalTenantId };
      if (responsible_key) profileUpdate.responsible_key = responsible_key;
      await adminClient.from("profiles").update(profileUpdate).eq("id", newUser.user.id);

      // Assign role
      await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: role || "user" });

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_user") {
      const { user_id, email, name, role, responsible_key, is_active, password } = body;

      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (name) updateData.user_metadata = { name };

      if (Object.keys(updateData).length > 0) {
        await adminClient.auth.admin.updateUserById(user_id, updateData);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (name) profileUpdate.name = name;
      if (email) profileUpdate.email = email;
      if (responsible_key !== undefined) profileUpdate.responsible_key = responsible_key;
      if (is_active !== undefined) profileUpdate.is_active = is_active;

      if (Object.keys(profileUpdate).length > 0) {
        await adminClient.from("profiles").update(profileUpdate).eq("id", user_id);
      }

      if (role) {
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("user_roles").insert({ user_id, role });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      await adminClient.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { user_id, new_password } = body;
      await adminClient.auth.admin.updateUserById(user_id, { password: new_password });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_all_users") {
      // Super admin only - list all users with tenant info
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Super admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");

      const users = (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        tenant_id: p.tenant_id,
        is_active: p.is_active,
        responsible_key: p.responsible_key,
        role: roles?.find((r: any) => r.user_id === p.id)?.role || null,
        created_at: p.created_at,
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
