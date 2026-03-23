import { supabase } from "@/integrations/supabase/client";

export async function sendMessage(phone: string, message: string) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { phone, message, type: "text" },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendMedia(phone: string, mediaUrl: string, type: string, caption?: string, mimetype?: string, fileName?: string) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { phone, mediaUrl, type, caption, mimetype, fileName },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendAudio(phone: string, audioBase64: string) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { phone, mediaUrl: audioBase64, type: "audio" },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadMedia(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("whatsapp-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
  return data.publicUrl;
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

export function getMediaType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}
