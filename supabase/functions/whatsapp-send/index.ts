import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { phone, message, type, mediaUrl, caption } = await req.json();
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "http://191.252.182.221:8080";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const INSTANCE = "crm-whatsapp";

    let endpoint: string;
    let body: Record<string, unknown>;

    const formattedPhone = phone.replace(/\D/g, "");

    if (type === "text") {
      endpoint = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE}`;
      body = {
        number: formattedPhone,
        text: message,
      };
    } else {
      endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE}`;
      body = {
        number: formattedPhone,
        mediatype: type,
        media: mediaUrl,
        caption: caption || "",
      };
    }

    const evoRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const evoData = await evoRes.json();

    if (!evoRes.ok) {
      return new Response(JSON.stringify({ error: "Evolution API error", details: evoData }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Save sent message to DB
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get or create conversation
    const { data: conv } = await serviceSupabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("phone", formattedPhone)
      .maybeSingle();

    let conversationId: string;
    if (conv) {
      conversationId = conv.id;
      await serviceSupabase.from("whatsapp_conversations").update({
        last_message: type === "text" ? message : (caption || `📎 ${type}`),
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      }).eq("id", conversationId);
    } else {
      const { data: newConv } = await serviceSupabase.from("whatsapp_conversations").insert({
        phone: formattedPhone,
        contact_name: formattedPhone,
        last_message: type === "text" ? message : (caption || `📎 ${type}`),
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        status: "open",
      }).select("id").single();
      conversationId = newConv!.id;
    }

    await serviceSupabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      phone: formattedPhone,
      body: type === "text" ? message : (caption || `📎 ${type}`),
      from_me: true,
      type,
      media_url: type !== "text" ? mediaUrl : null,
      media_type: type !== "text" ? type : null,
      timestamp: new Date().toISOString(),
      status: "sent",
    });

    return new Response(JSON.stringify({ ok: true, data: evoData }), { headers: corsHeaders });
  } catch (error) {
    console.error("Send error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
