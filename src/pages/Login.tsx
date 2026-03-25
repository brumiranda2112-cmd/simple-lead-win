import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logoKhronos from '@/assets/logo-khronos.png';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Preencha todos os campos'); return; }
    setLoading(true);
    const result = await login(email, password);
    if (result.error) {
      setError('Email ou senha incorretos');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logoKhronos} alt="KHRÓNOS AI" className="h-28 mx-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl">KHRÓNOS <span className="text-primary">CRM</span></CardTitle>
            <CardDescription className="mt-1">
              Entre com suas credenciais
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Contate o administrador para obter acesso
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
