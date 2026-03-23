
-- Quick replies table
CREATE TABLE public.quick_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage quick_replies" ON public.quick_replies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Labels table
CREATE TABLE public.labels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage labels" ON public.labels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add labels array to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

-- Scheduled messages table
CREATE TABLE public.scheduled_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage scheduled_messages" ON public.scheduled_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
