import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Shield, Pencil, Trash2, KeyRound, Users, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  responsible_key: string | null;
  is_active: boolean;
  role: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-destructive text-destructive-foreground' },
  manager: { label: 'Gerente', color: 'bg-primary text-primary-foreground' },
  user: { label: 'Usuário', color: 'bg-muted text-muted-foreground' },
};

const RESPONSIBLE_OPTIONS = [
  { value: '', label: 'Nenhum' },
  { value: 'bruno', label: 'Bruno' },
  { value: 'gustavo', label: 'Gustavo' },
  { value: 'ana_luiza', label: 'Ana Luiza' },
];

export default function Admin() {
  const { isAdmin, session } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [resetUser, setResetUser] = useState<UserWithRole | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    if (profiles) {
      const usersWithRoles: UserWithRole[] = profiles.map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        responsible_key: p.responsible_key,
        is_active: p.is_active,
        role: roles?.find((r: any) => r.user_id === p.id)?.role || null,
        created_at: p.created_at,
      }));
      setUsers(usersWithRoles);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const callAdmin = async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { action, ...body },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta área.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Administração
          </h1>
          <p className="text-muted-foreground">Gerencie usuários, funções e permissões</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <CreateUserForm onSuccess={() => { setCreateOpen(false); fetchUsers(); }} callAdmin={callAdmin} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Shield className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-sm text-muted-foreground">Administradores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge className={ROLE_LABELS[u.role]?.color || ''}>
                          {ROLE_LABELS[u.role]?.label || u.role}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sem função</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {RESPONSIBLE_OPTIONS.find(r => r.value === u.responsible_key)?.label || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditUser(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setResetUser(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                        if (!confirm(`Excluir ${u.name}?`)) return;
                        try {
                          await callAdmin('delete_user', { user_id: u.id });
                          toast.success('Usuário excluído');
                          fetchUsers();
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <EditUserForm user={editUser} onSuccess={() => { setEditUser(null); fetchUsers(); }} callAdmin={callAdmin} />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha — {resetUser?.name}</DialogTitle>
          </DialogHeader>
          {resetUser && (
            <ResetPasswordForm userId={resetUser.id} onSuccess={() => { setResetUser(null); }} callAdmin={callAdmin} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onSuccess, callAdmin }: { onSuccess: () => void; callAdmin: (action: string, body: Record<string, unknown>) => Promise<any> }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [responsibleKey, setResponsibleKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password) { toast.error('Preencha todos os campos obrigatórios'); return; }
    setLoading(true);
    try {
      await callAdmin('create_user', { email, password, name, role, responsible_key: responsibleKey || null });
      toast.success(`Usuário ${name} criado com sucesso`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
      </div>
      <div className="space-y-2">
        <Label>Email *</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
      </div>
      <div className="space-y-2">
        <Label>Senha *</Label>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
      </div>
      <div className="space-y-2">
        <Label>Função</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="manager">Gerente</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Responsável CRM</Label>
        <Select value={responsibleKey} onValueChange={setResponsibleKey}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {RESPONSIBLE_OPTIONS.map(o => (
              <SelectItem key={o.value || 'none'} value={o.value || 'none'}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
        Criar Usuário
      </Button>
    </form>
  );
}

function EditUserForm({ user, onSuccess, callAdmin }: { user: UserWithRole; onSuccess: () => void; callAdmin: (action: string, body: Record<string, unknown>) => Promise<any> }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role || 'user');
  const [responsibleKey, setResponsibleKey] = useState(user.responsible_key || '');
  const [isActive, setIsActive] = useState(user.is_active);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callAdmin('update_user', {
        user_id: user.id,
        name,
        email,
        role,
        responsible_key: responsibleKey || null,
        is_active: isActive,
      });
      toast.success('Usuário atualizado');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Função</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="manager">Gerente</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Responsável CRM</Label>
        <Select value={responsibleKey} onValueChange={setResponsibleKey}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {RESPONSIBLE_OPTIONS.map(o => (
              <SelectItem key={o.value || 'none'} value={o.value || 'none'}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
        <Label htmlFor="active">Ativo</Label>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
      </Button>
    </form>
  );
}

function ResetPasswordForm({ userId, onSuccess, callAdmin }: { userId: string; onSuccess: () => void; callAdmin: (action: string, body: Record<string, unknown>) => Promise<any> }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await callAdmin('reset_password', { user_id: userId, new_password: newPassword });
      toast.success('Senha resetada com sucesso');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nova Senha</Label>
        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetar Senha'}
      </Button>
    </form>
  );
}
