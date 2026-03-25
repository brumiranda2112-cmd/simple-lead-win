import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logoKhronos from '@/assets/logo-khronos.png';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const MASTER_EMAIL = 'khronos@crm.ia';

export default function Setup() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only accessible when logged in as master account
  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (email.toLowerCase() === MASTER_EMAIL) {
      setError('Não é possível usar este email');
      return;
    }

    setLoading(true);
    try {
      // Use admin-create-user edge function (caller is authenticated as master/admin)
      const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'create_user', email, password, name, role: 'admin' },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      toast.success('Conta criada com sucesso! Faça login com suas novas credenciais.');
      
      // Logout from master account so user can login with their new account
      await logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    }
    setLoading(false);
  };

  if (!isMaster) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={branding.fullLogoUrl || logoKhronos} alt={branding.companyName} className="h-20 mx-auto object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Configuração Inicial
            </CardTitle>
            <CardDescription className="mt-2">
              Crie sua conta de administrador para começar a usar o sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</> : 'Criar minha conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
