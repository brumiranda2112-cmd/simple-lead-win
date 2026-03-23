import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(jid: string): { phone: string; isGroup: boolean } {
  if (!jid) return { phone: '', isGroup: false };
  const isGroup = jid.includes('@g.us');
  if (isGroup) {
    // Keep group ID intact but clean
    const groupId = jid.split('@')[0];
    return { phone: groupId + '@g.us', isGroup: true };
  }
  // For regular contacts, strip everything except digits
  const digits = jid.split('@')[0]?.replace(/[^0-9]/g, '') || '';
  return { phone: digits, isGroup: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const event = body.event;

    if (event === "messages.upsert") {
      const data = body.data;
      if (!data) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

      const msg = data;
      const key = msg.key;
      const rawJid = key.remoteJid || '';
      const { phone, isGroup } = normalizePhone(rawJid);

      if (!phone || phone === "status") {
        return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders });
      }

      const fromMe = key.fromMe || false;
      const messageId = key.id || null;
      const pushName = msg.pushName || null;
      const timestamp = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Determine message type and content
      let messageBody = "";
      let messageType = "text";
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      const msgContent = msg.message;
      if (msgContent) {
        if (msgContent.conversation) {
          messageBody = msgContent.conversation;
        } else if (msgContent.extendedTextMessage?.text) {
          messageBody = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          messageType = "image";
          mediaType = msgContent.imageMessage.mimetype || "image/jpeg";
          mediaUrl = msgContent.imageMessage.url || null;
          messageBody = msgContent.imageMessage.caption || "📷 Imagem";
        } else if (msgContent.videoMessage) {
          messageType = "video";
          mediaType = msgContent.videoMessage.mimetype || "video/mp4";
          mediaUrl = msgContent.videoMessage.url || null;
          messageBody = msgContent.videoMessage.caption || "🎥 Vídeo";
        } else if (msgContent.audioMessage) {
          messageType = msgContent.audioMessage.ptt ? "ptt" : "audio";
          mediaType = msgContent.audioMessage.mimetype || "audio/ogg";
          mediaUrl = msgContent.audioMessage.url || null;
          messageBody = "🎵 Áudio";
        } else if (msgContent.documentMessage) {
          messageType = "document";
          mediaType = msgContent.documentMessage.mimetype || "application/pdf";
          mediaUrl = msgContent.documentMessage.url || null;
          messageBody = msgContent.documentMessage.fileName || "📄 Documento";
        } else if (msgContent.stickerMessage) {
          messageType = "sticker";
          messageBody = "🏷️ Sticker";
        } else {
          messageBody = "[Mensagem não suportada]";
        }
      }

      // Upsert conversation using normalized phone
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id, unread_count, contact_name")
        .eq("phone", phone)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
        const newUnread = fromMe ? 0 : (existingConv.unread_count || 0) + 1;
        await supabase
          .from("whatsapp_conversations")
          .update({
            contact_name: pushName || existingConv.contact_name,
            last_message: messageBody,
            last_message_at: timestamp,
            unread_count: newUnread,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      } else {
        const { data: newConv } = await supabase
          .from("whatsapp_conversations")
          .insert({
            phone,
            contact_name: pushName || phone,
            last_message: messageBody,
            last_message_at: timestamp,
            unread_count: fromMe ? 0 : 1,
            status: "open",
          })
          .select("id")
          .single();
        conversationId = newConv!.id;
      }

      // Insert message
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        message_id: messageId,
        phone,
        body: messageBody,
        from_me: fromMe,
        type: messageType,
        media_url: mediaUrl,
        media_type: mediaType,
        timestamp,
        status: fromMe ? "sent" : "received",
      });

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "connection.update") {
      console.log("Connection update:", JSON.stringify(body.data));
      return new Response(JSON.stringify({ ok: true, event: "connection.update" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, event: "unhandled" }), { headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
