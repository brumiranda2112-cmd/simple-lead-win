import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const PERMISSION_MODULES = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    actions: [
      { key: 'dashboard.view', label: 'Ver' },
    ],
  },
  {
    module: 'leads',
    label: 'Leads / Clientes',
    actions: [
      { key: 'leads.view', label: 'Ver' },
      { key: 'leads.create', label: 'Criar' },
      { key: 'leads.edit', label: 'Editar' },
      { key: 'leads.delete', label: 'Apagar' },
    ],
  },
  {
    module: 'pipeline',
    label: 'Pipeline',
    actions: [
      { key: 'pipeline.view', label: 'Ver' },
      { key: 'pipeline.create', label: 'Criar' },
      { key: 'pipeline.edit', label: 'Editar' },
      { key: 'pipeline.delete', label: 'Apagar' },
    ],
  },
  {
    module: 'tasks',
    label: 'Tarefas',
    actions: [
      { key: 'tasks.view', label: 'Ver' },
      { key: 'tasks.create', label: 'Criar' },
      { key: 'tasks.edit', label: 'Editar' },
      { key: 'tasks.delete', label: 'Apagar' },
    ],
  },
  {
    module: 'financeiro',
    label: 'Financeiro',
    actions: [
      { key: 'financeiro.view', label: 'Ver' },
      { key: 'financeiro.create', label: 'Criar' },
      { key: 'financeiro.edit', label: 'Editar' },
      { key: 'financeiro.delete', label: 'Apagar' },
    ],
  },
  {
    module: 'agendamentos',
    label: 'Agendamentos',
    actions: [
      { key: 'agendamentos.view', label: 'Ver' },
      { key: 'agendamentos.create', label: 'Criar' },
      { key: 'agendamentos.edit', label: 'Editar' },
      { key: 'agendamentos.delete', label: 'Apagar' },
    ],
  },
  {
    module: 'whatsapp',
    label: 'WhatsApp',
    actions: [
      { key: 'whatsapp.view', label: 'Ver' },
      { key: 'whatsapp.edit', label: 'Enviar / Editar' },
    ],
  },
  {
    module: 'admin',
    label: 'Administração',
    actions: [
      { key: 'admin.view', label: 'Ver' },
      { key: 'admin.manage_users', label: 'Gerenciar Usuários' },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_MODULES.flatMap(m => m.actions.map(a => a.key));

export function useUserPermissions(userId?: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', userId);
    setPermissions(data?.map((r: any) => r.permission) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const savePermissions = async (newPermissions: string[]) => {
    if (!userId) return;
    // Delete all existing
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    // Insert new
    if (newPermissions.length > 0) {
      const rows = newPermissions.map(p => ({ user_id: userId, permission: p }));
      await supabase.from('user_permissions').insert(rows);
    }
    setPermissions(newPermissions);
  };

  return { permissions, loading, fetchPermissions, savePermissions };
}

export function useMyPermissions() {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      // Admins get all permissions
      setPermissions(ALL_PERMISSION_KEYS);
      setLoaded(true);
      return;
    }
    supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setPermissions(data?.map((r: any) => r.permission) || []);
        setLoaded(true);
      });
  }, [user, isAdmin]);

  const hasPermission = useCallback((key: string) => {
    if (isAdmin) return true;
    return permissions.includes(key);
  }, [permissions, isAdmin]);

  return { permissions, hasPermission, loaded };
}
