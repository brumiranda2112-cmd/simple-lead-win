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

    const payload = await req.json();
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "http://191.252.182.221:8080";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const INSTANCE = "crm-whatsapp";

    // ── Status / QR actions ──
    if (payload.action === "check_status") {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });
      const instances = await res.json();
      const inst = Array.isArray(instances)
        ? instances.find((i: any) => i.instance?.instanceName === INSTANCE)
        : null;
      const connected = inst?.instance?.state === "open" || inst?.instance?.connectionStatus === "open";
      const phone = inst?.instance?.owner || "";
      return new Response(JSON.stringify({ connected, phone }), { headers: corsHeaders });
    }

    if (payload.action === "connect_qr") {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE}`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });
      const data = await res.json();
      const qr = data?.base64 || data?.qrcode?.base64 || data?.qr || null;
      return new Response(JSON.stringify({ qr }), { headers: corsHeaders });
    }

    if (payload.action === "disconnect") {
      await fetch(`${EVOLUTION_API_URL}/instance/logout/${INSTANCE}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // ── Send message ──
    const { phone, message, type, mediaUrl, caption, mimetype, fileName } = payload;
    const formattedPhone = phone.replace(/\D/g, "");

    let endpoint: string;
    let body: Record<string, unknown>;

    if (type === "text") {
      endpoint = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE}`;
      body = { number: formattedPhone, textMessage: { text: message } };
    } else if (type === "audio") {
      endpoint = `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${INSTANCE}`;
      body = { number: formattedPhone, audioMessage: { audio: mediaUrl }, encoding: true };
    } else {
      endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE}`;
      body = {
        number: formattedPhone,
        mediatype: type,
        mimetype: mimetype || (type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "application/pdf"),
        media: mediaUrl,
        fileName: fileName || `file.${type === "image" ? "jpg" : type === "video" ? "mp4" : "pdf"}`,
        caption: caption || "",
      };
    }

    const evoRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify(body),
    });

    const evoData = await evoRes.json();
    if (!evoRes.ok) {
      console.error("Evolution API error:", JSON.stringify(evoData));
      return new Response(JSON.stringify({ error: "Evolution API error", details: evoData }), { status: 500, headers: corsHeaders });
    }

    // Save sent message to DB
    const serviceSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conv } = await serviceSupabase
      .from("whatsapp_conversations").select("id").eq("phone", formattedPhone).maybeSingle();

    const msgPreview = type === "text" ? message : (caption || `📎 ${type}`);
    let conversationId: string;

    if (conv) {
      conversationId = conv.id;
      await serviceSupabase.from("whatsapp_conversations").update({
        last_message: msgPreview, last_message_at: new Date().toISOString(), unread_count: 0,
      }).eq("id", conversationId);
    } else {
      const { data: newConv } = await serviceSupabase.from("whatsapp_conversations").insert({
        phone: formattedPhone, contact_name: formattedPhone,
        last_message: msgPreview, last_message_at: new Date().toISOString(), unread_count: 0, status: "open",
      }).select("id").single();
      conversationId = newConv!.id;
    }

    await serviceSupabase.from("whatsapp_messages").insert({
      conversation_id: conversationId, phone: formattedPhone,
      body: type === "text" ? message : (caption || `📎 ${type}`),
      from_me: true, type, media_url: type !== "text" ? mediaUrl : null,
      media_type: type !== "text" ? type : null, timestamp: new Date().toISOString(), status: "sent",
    });

    return new Response(JSON.stringify({ ok: true, data: evoData }), { headers: corsHeaders });
  } catch (error) {
    console.error("Send error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
