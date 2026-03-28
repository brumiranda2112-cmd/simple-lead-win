
-- Replace overly permissive ALL policy with role-based access
DROP POLICY IF EXISTS "Authenticated can manage bookings" ON public.bookings;

-- Only admins/managers can read all bookings
CREATE POLICY "Staff can view all bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Only admins/managers can insert bookings (authenticated)
CREATE POLICY "Staff can insert bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Only admins/managers can update bookings
CREATE POLICY "Staff can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Only admins can delete bookings
CREATE POLICY "Admins can delete bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
