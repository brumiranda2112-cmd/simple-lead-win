CREATE POLICY "authenticated_delete_messages" ON public.whatsapp_messages FOR DELETE TO authenticated USING (auth.role() = 'authenticated'::text);
CREATE POLICY "authenticated_delete_conversations" ON public.whatsapp_conversations FOR DELETE TO authenticated USING (auth.role() = 'authenticated'::text);
CREATE POLICY "authenticated_insert_messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_insert_conversations" ON public.whatsapp_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anon_insert_conversations" ON public.whatsapp_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_messages" ON public.whatsapp_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_conversations" ON public.whatsapp_conversations FOR UPDATE TO anon USING (true) WITH CHECK (true);