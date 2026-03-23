DELETE FROM whatsapp_messages WHERE conversation_id IN (
  SELECT id FROM whatsapp_conversations WHERE phone = '168702137880690'
);
DELETE FROM whatsapp_conversations WHERE phone = '168702137880690';