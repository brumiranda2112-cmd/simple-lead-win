import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "http://191.252.182.221:8080";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const INSTANCE = "crm-whatsapp";

    // Get pending scheduled messages
    const now = new Date().toISOString();
    const { data: pending } = await serviceSupabase
      .from("scheduled_messages")
      .select("*")
      .eq("sent", false)
      .lte("scheduled_at", now);

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });
    }

    let processed = 0;
    for (const msg of pending) {
      try {
        const phone = msg.phone.replace(/\D/g, "");
        await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
          body: JSON.stringify({ number: phone, textMessage: { text: msg.message } }),
        });

        // Update conversation
        const { data: conv } = await serviceSupabase
          .from("whatsapp_conversations").select("id").eq("phone", phone).maybeSingle();

        if (conv) {
          await serviceSupabase.from("whatsapp_conversations").update({
            last_message: msg.message, last_message_at: new Date().toISOString(),
          }).eq("id", conv.id);

          await serviceSupabase.from("whatsapp_messages").insert({
            conversation_id: conv.id, phone, body: msg.message,
            from_me: true, type: "text", timestamp: new Date().toISOString(), status: "sent",
          });
        }

        await serviceSupabase.from("scheduled_messages").update({ sent: true }).eq("id", msg.id);
        processed++;
      } catch (e) {
        console.error("Failed to send scheduled message:", msg.id, e);
      }
    }

    return new Response(JSON.stringify({ processed }), { headers: corsHeaders });
  } catch (error) {
    console.error("Process scheduled error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
