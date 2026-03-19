import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export default function Login() {
  const { hasAccount, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(!hasAccount);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      if (!email || !name || !password) { setError('Preencha todos os campos'); return; }
      register(email, name, password);
    } else {
      if (!login(email, password)) { setError('Email ou senha incorretos'); }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scale className="w-7 h-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">CRM Advocacia</CardTitle>
            <CardDescription className="mt-1">
              {isRegister ? 'Crie sua conta para começar' : 'Entre com suas credenciais'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">{isRegister ? 'Criar Conta' : 'Entrar'}</Button>
          </form>
          {hasAccount && (
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              {isRegister ? 'Já tem conta? Entre aqui' : 'Primeira vez? Crie uma conta'}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
