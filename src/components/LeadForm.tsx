import { useState } from 'react';
import { Lead, LeadArea, LeadSource, LeadStatus, LeadResponsible, LeadType, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_PIPELINE_STATUS_LABELS, CLIENT_PIPELINE_STATUS_LABELS, LEAD_RESPONSIBLE_LABELS } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
    responsible: lead?.responsible || 'bruno' as LeadResponsible,
    estimatedValue: lead?.estimatedValue || 0,
    leadType: lead?.leadType || defaultLeadType,
    status: lead?.status || (defaultLeadType === 'cliente' ? 'cliente_novo' : 'lead_qualificado') as LeadStatus,
    notes: lead?.notes || '',
    nextFollowup: lead?.nextFollowup || null,
    wonLostReason: lead?.wonLostReason || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  const update = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

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
