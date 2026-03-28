import { useState } from 'react';
import { Lead, LeadArea, LeadSource, LeadStatus, LeadResponsible, LeadType, LeadProject, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_PIPELINE_STATUS_LABELS, CLIENT_PIPELINE_STATUS_LABELS, LEAD_RESPONSIBLE_LABELS } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSave: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  defaultLeadType?: LeadType;
}

export function LeadForm({ open, onOpenChange, lead, onSave, defaultLeadType = 'lead' }: Props) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    area: lead?.area || 'agentes_ia' as LeadArea,
    source: lead?.source || 'indicacao' as LeadSource,
    responsible: lead?.responsible || '',
    estimatedValue: lead?.estimatedValue || 0,
    leadType: lead?.leadType || defaultLeadType,
    status: lead?.status || (defaultLeadType === 'cliente' ? 'cliente_novo' : 'lead_qualificado') as LeadStatus,
    notes: lead?.notes || '',
    nextFollowup: lead?.nextFollowup || null,
    wonLostReason: lead?.wonLostReason || '',
  });
  const [projects, setProjects] = useState<LeadProject[]>(lead?.projects || []);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    onSave({ ...form, projects });
    onOpenChange(false);
  };

  const update = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  const addProject = () => {
    setProjects(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      area: 'agentes_ia' as LeadArea,
      estimatedValue: 0,
      notes: '',
    }]);
  };

  const updateProject = (id: string, field: keyof LeadProject, value: unknown) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const statusLabels = form.leadType === 'cliente' ? CLIENT_PIPELINE_STATUS_LABELS : LEAD_PIPELINE_STATUS_LABELS;
  const entityLabel = form.leadType === 'cliente' ? 'Cliente' : 'Lead';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Nome da empresa" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.responsible} onValueChange={v => update('responsible', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_RESPONSIBLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={form.area} onValueChange={v => update('area', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_AREA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={form.source} onValueChange={v => update('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={form.estimatedValue} onChange={e => update('estimatedValue', Number(e.target.value))} />
            </div>
          </div>
          {lead && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Próximo Follow-up</Label>
            <Input type="datetime-local" value={form.nextFollowup || ''} onChange={e => update('nextFollowup', e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Notas..." rows={3} />
          </div>

          {form.leadType === 'cliente' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Trabalhos / Projetos</Label>
                <Button type="button" size="sm" variant="outline" onClick={addProject}>
                  <Plus className="w-3 h-3 mr-1" />Adicionar
                </Button>
              </div>
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum trabalho adicionado. Use o botão acima para adicionar projetos a este cliente.</p>
              )}
              {projects.map((proj, i) => (
                <Card key={proj.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Trabalho {i + 1}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeProject(proj.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nome do trabalho"
                    value={proj.name}
                    onChange={e => updateProject(proj.id, 'name', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={proj.area} onValueChange={v => updateProject(proj.id, 'area', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_AREA_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Valor R$"
                      className="h-8 text-xs"
                      value={proj.estimatedValue}
                      onChange={e => updateProject(proj.id, 'estimatedValue', Number(e.target.value))}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
