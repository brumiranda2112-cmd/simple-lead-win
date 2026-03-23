import { supabase } from "@/integrations/supabase/client";

const EVOLUTION_API_URL = "http://191.252.182.221:8080";
const INSTANCE_NAME = "crm-whatsapp";

async function getEvolutionHeaders() {
  // Fetch API key from edge function proxy to avoid exposing in client
  // For now we use the edge function to send messages
  return {
    "Content-Type": "application/json",
  };
}

export async function sendMessage(phone: string, message: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/whatsapp-send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ phone, message, type: "text" }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendMedia(phone: string, mediaUrl: string, type: string, caption?: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/whatsapp-send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ phone, mediaUrl, type, caption }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getConversations() {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return data;
}

export async function markAsRead(conversationId: string) {
  await supabase
    .from("whatsapp_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);
}

export async function getTotalUnread(): Promise<number> {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("unread_count");
  if (error || !data) return 0;
  return data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
}
