import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, Users, ShieldAlert, Loader2, Building2, Trash2, KeyRound, Power, PowerOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SUPER_ADMIN_EMAIL = 'bruno.fontes@khronos.ia';
const MASTER_EMAIL = 'khronos@crm.ia';
const SYSTEM_EMAILS = [SUPER_ADMIN_EMAIL, MASTER_EMAIL];

interface TenantUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string | null;
  is_active: boolean;
  role: string | null;
  created_at: string;
}

export default function SuperAdmin() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetUser, setResetUser] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { action: 'list_all_users' },
    });
    if (error) {
      toast.error('Erro ao carregar usuários');
    } else {
      setUsers(data?.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (isSuperAdmin) fetchUsers(); }, [fetchUsers, isSuperAdmin]);

  const handleDelete = async (u: TenantUser) => {
    if (SYSTEM_EMAILS.includes(u.email.toLowerCase())) {
      toast.error('Não é possível excluir contas do sistema');
      return;
    }
    if (!confirm(`Excluir ${u.name} (${u.email})?`)) return;
    try {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'delete_user', user_id: u.id },
      });
      if (error) throw error;
      toast.success('Usuário excluído');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setResetLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'reset_password', user_id: resetUser.id, new_password: newPassword },
      });
      if (error) throw error;
      toast.success('Senha resetada');
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setResetLoading(false);
  };

  const handleToggleTenant = async (tenantId: string, currentlyActive: boolean) => {
    const newState = !currentlyActive;
    try {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'toggle_tenant', tenant_id: tenantId, is_active: newState },
      });
      if (error) throw error;
      toast.success(newState ? 'Tenant ativado' : 'Tenant desativado');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">Painel exclusivo do Super Administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group users by tenant
  const clientUsers = users.filter(u => !SYSTEM_EMAILS.includes(u.email.toLowerCase()));
  const tenantGroups: Record<string, TenantUser[]> = {};
  clientUsers.forEach(u => {
    const tid = u.tenant_id || 'sem-tenant';
    if (!tenantGroups[tid]) tenantGroups[tid] = [];
    tenantGroups[tid].push(u);
  });

  // For each tenant group, find root admin (tenant_id === own id)
  const tenants = Object.entries(tenantGroups).map(([tenantId, members]) => {
    const root = members.find(m => m.id === tenantId) || members[0];
    const allActive = members.every(m => m.is_active);
    return { tenantId, rootName: root?.name || 'Desconhecido', rootEmail: root?.email || '', members, allActive };
  });

  const totalClients = tenants.length;
  const totalUsers = clientUsers.length;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Painel Super Admin — Khronos
        </h1>
        <p className="text-muted-foreground">Controle total de clientes e usuários da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalClients}</p>
              <p className="text-sm text-muted-foreground">Clientes (Tenants)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Shield className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{clientUsers.filter(u => u.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Usuários Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum cliente registrado ainda.
          </CardContent>
        </Card>
      ) : (
        tenants.map(({ tenantId, rootName, rootEmail, members, allActive }) => (
          <Card key={tenantId} className={!allActive ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                <Building2 className="h-5 w-5 text-primary" />
                {rootName}
                <Badge variant="outline" className="text-xs">{rootEmail}</Badge>
                <Badge variant={allActive ? 'default' : 'secondary'}>
                  {allActive ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge className="ml-auto">{members.length} usuário(s)</Badge>
                <Switch
                  checked={allActive}
                  onCheckedChange={() => handleToggleTenant(tenantId, allActive)}
                  aria-label="Ativar/Desativar tenant"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === 'admin' ? 'destructive' : 'secondary'}>
                          {m.role === 'admin' ? 'Admin' : m.role === 'manager' ? 'Gerente' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? 'default' : 'secondary'}>
                          {m.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => { setResetUser(m); setNewPassword(''); }}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={o => !o && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha — {resetUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetar Senha'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
