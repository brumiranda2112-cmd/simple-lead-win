
-- Add missing permission values to enum
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'leads.create';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'pipeline.create';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'pipeline.delete';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'tasks.create';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'financeiro.create';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'financeiro.delete';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'agendamentos.view';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'agendamentos.create';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'agendamentos.edit';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'agendamentos.delete';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'whatsapp.view';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'whatsapp.edit';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'dashboard.view';

-- Create user_permissions table for per-user granular control
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL,
  UNIQUE(user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage user permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create function to check user permission from user_permissions table
CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  )
$$;
