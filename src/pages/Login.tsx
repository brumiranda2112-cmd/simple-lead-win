import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logoKhronos from '@/assets/logo-khronos.png';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Ensure default admin exists on first access
    supabase.functions.invoke('bootstrap-admin', { method: 'GET' })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4 relative"
      style={branding.loginBgUrl ? {
        backgroundImage: `url(${branding.loginBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {branding.loginBgUrl && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />}
      <Card className="w-full max-w-md border-border/50 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={branding.fullLogoUrl || logoKhronos} alt={branding.companyName} className="h-28 mx-auto object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">{branding.companyName} <span className="text-primary">{branding.crmLabel}</span></CardTitle>
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
