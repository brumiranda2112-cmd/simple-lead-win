DELETE FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT wc.id FROM whatsapp_conversations wc 
  WHERE wc.id NOT IN (
    SELECT DISTINCT ON (phone) id FROM whatsapp_conversations ORDER BY phone, created_at ASC
  )
);

DELETE FROM whatsapp_conversations 
WHERE id NOT IN (
  SELECT DISTINCT ON (phone) id FROM whatsapp_conversations ORDER BY phone, created_at ASC
);

UPDATE whatsapp_conversations 
SET phone = regexp_replace(split_part(phone, '@', 1), '[^0-9]', '', 'g')
WHERE phone LIKE '%@s.whatsapp.net' OR phone LIKE '%@c.us' OR phone LIKE '%@lid';

UPDATE whatsapp_messages 
SET phone = regexp_replace(split_part(phone, '@', 1), '[^0-9]', '', 'g')
WHERE phone LIKE '%@s.whatsapp.net' OR phone LIKE '%@c.us' OR phone LIKE '%@lid';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_phone_unique ON whatsapp_conversations (phone);