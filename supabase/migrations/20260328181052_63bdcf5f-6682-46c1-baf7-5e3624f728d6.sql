
-- 1. Fix bookings: drop overly permissive public SELECT, keep authenticated access
DROP POLICY IF EXISTS "Public can view own bookings by phone" ON public.bookings;

-- 2. Fix whatsapp_conversations: drop anonymous insert/update policies
DROP POLICY IF EXISTS "anon_insert_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "anon_update_conversations" ON public.whatsapp_conversations;

-- 3. Fix whatsapp_messages: drop anonymous insert policy
DROP POLICY IF EXISTS "anon_insert_messages" ON public.whatsapp_messages;

-- 4. Tighten bookings INSERT for public (needed for public booking page)
-- Keep "Anyone can create bookings" but restrict fields
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
CREATE POLICY "Anyone can create bookings" ON public.bookings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (status = 'confirmed');

-- 5. Tighten overly permissive write policies on other tables
-- availability_settings: restrict writes to authenticated only (already has ALL for authenticated)
-- blocked_dates: same pattern, already correct
-- labels, quick_replies: already authenticated only
