import { useState } from 'react';
import { useBranding, BRANDING_DEFAULTS } from '@/contexts/BrandingContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Palette, Image, Type, RotateCcw, Save, Eye } from 'lucide-react';

function hslToHex(hslStr: string): string {
  try {
    const [h, sRaw, lRaw] = hslStr.split(/\s+/);
    const s = parseFloat(sRaw) / 100;
    const l = parseFloat(lRaw) / 100;
    const hue = parseFloat(h);
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + hue / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return '#f97316';
  }
}

function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return '25 95% 53%';
  }
}

export default function BrandingManager() {
  const { branding, updateBranding, resetBranding } = useBranding();
  const [form, setForm] = useState(branding);

  const handleSave = () => {
    updateBranding(form);
    toast.success('Personalização salva com sucesso!');
  };

  const handleReset = () => {
    if (!confirm('Restaurar todas as configurações de marca para o padrão?')) return;
    resetBranding();
    setForm(BRANDING_DEFAULTS);
    toast.success('Configurações restauradas');
  };

  const handleFileUpload = (field: 'logoUrl' | 'fullLogoUrl' | 'faviconUrl' | 'loginBgUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm(prev => ({ ...prev, [field]: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Identidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-primary" /> Identidade</CardTitle>
          <CardDescription>Nome da empresa e textos principais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input value={form.companyName} onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))} placeholder="KHRÓNOS" />
            </div>
            <div className="space-y-2">
              <Label>Label do CRM</Label>
              <Input value={form.crmLabel} onChange={e => setForm(prev => ({ ...prev, crmLabel: e.target.value }))} placeholder="CRM" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logos e Imagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" /> Logos e Imagens</CardTitle>
          <CardDescription>Faça upload das imagens ou cole uma URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sidebar Icon */}
          <div className="space-y-2">
            <Label>Ícone da Sidebar (pequeno, quadrado)</Label>
            <div className="flex items-center gap-4">
              {form.logoUrl && <img src={form.logoUrl} alt="icon" className="h-10 w-10 rounded-md object-cover border border-border" />}
              <div className="flex-1 space-y-1">
                <Input type="file" accept="image/*" onChange={handleFileUpload('logoUrl')} className="text-sm" />
                <span className="text-xs text-muted-foreground">ou cole uma URL:</span>
                <Input value={form.logoUrl} onChange={e => setForm(prev => ({ ...prev, logoUrl: e.target.value }))} placeholder="https://..." className="text-xs" />
              </div>
            </div>
          </div>

          {/* Full Logo */}
          <div className="space-y-2">
            <Label>Logo Completo (tela de login)</Label>
            <div className="flex items-center gap-4">
              {form.fullLogoUrl && <img src={form.fullLogoUrl} alt="logo" className="h-16 max-w-[200px] object-contain border border-border rounded-md p-1" />}
              <div className="flex-1 space-y-1">
                <Input type="file" accept="image/*" onChange={handleFileUpload('fullLogoUrl')} className="text-sm" />
                <span className="text-xs text-muted-foreground">ou cole uma URL:</span>
                <Input value={form.fullLogoUrl} onChange={e => setForm(prev => ({ ...prev, fullLogoUrl: e.target.value }))} placeholder="https://..." className="text-xs" />
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="flex items-center gap-4">
              {form.faviconUrl && <img src={form.faviconUrl} alt="favicon" className="h-8 w-8 object-contain border border-border rounded" />}
              <div className="flex-1 space-y-1">
                <Input type="file" accept="image/*" onChange={handleFileUpload('faviconUrl')} className="text-sm" />
                <span className="text-xs text-muted-foreground">ou cole uma URL:</span>
                <Input value={form.faviconUrl} onChange={e => setForm(prev => ({ ...prev, faviconUrl: e.target.value }))} placeholder="/favicon.png" className="text-xs" />
              </div>
            </div>
          </div>

          {/* Login Background */}
          <div className="space-y-2">
            <Label>Imagem de Fundo (Tela de Login)</Label>
            <div className="flex items-center gap-4">
              {form.loginBgUrl && <img src={form.loginBgUrl} alt="bg" className="h-16 w-28 object-cover border border-border rounded-md" />}
              <div className="flex-1 space-y-1">
                <Input type="file" accept="image/*" onChange={handleFileUpload('loginBgUrl')} className="text-sm" />
                <span className="text-xs text-muted-foreground">ou cole uma URL:</span>
                <Input value={form.loginBgUrl} onChange={e => setForm(prev => ({ ...prev, loginBgUrl: e.target.value }))} placeholder="https://..." className="text-xs" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Paleta de Cores</CardTitle>
          <CardDescription>Clique no seletor para alterar as cores do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              { key: 'primaryColor', label: 'Cor Primária' },
              { key: 'accentColor', label: 'Cor de Destaque' },
              { key: 'backgroundColor', label: 'Fundo Geral' },
              { key: 'sidebarBg', label: 'Fundo da Sidebar' },
              { key: 'cardBg', label: 'Fundo dos Cards' },
            ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(form[key])}
                    onChange={e => setForm(prev => ({ ...prev, [key]: hexToHsl(e.target.value) }))}
                    className="h-10 w-14 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <code className="text-xs text-muted-foreground flex-1 bg-secondary/50 px-2 py-1 rounded">{form[key]}</code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden" style={{ background: `hsl(${form.backgroundColor})` }}>
            <div className="flex">
              {/* Mini sidebar */}
              <div className="w-48 p-4 border-r border-border" style={{ background: `hsl(${form.sidebarBg})` }}>
                <div className="flex items-center gap-2 mb-4">
                  {form.logoUrl ? <img src={form.logoUrl} className="h-6 w-6 rounded" /> : <div className="h-6 w-6 rounded" style={{ background: `hsl(${form.primaryColor})` }} />}
                  <span className="text-sm font-bold text-foreground">{form.companyName} <span style={{ color: `hsl(${form.primaryColor})` }}>{form.crmLabel}</span></span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Clientes', 'Leads'].map(i => (
                    <div key={i} className="text-xs text-muted-foreground px-2 py-1.5 rounded hover:bg-white/5">{i}</div>
                  ))}
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 p-6">
                <div className="rounded-lg p-4" style={{ background: `hsl(${form.cardBg})` }}>
                  <div className="text-sm font-semibold text-foreground mb-2">Card de Exemplo</div>
                  <div className="h-2 rounded-full w-3/4 mb-1" style={{ background: `hsl(${form.primaryColor})` }} />
                  <div className="h-2 rounded-full w-1/2" style={{ background: `hsl(${form.accentColor})` }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Restaurar Padrão
        </Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Personalização
        </Button>
      </div>
    </div>
  );
}
