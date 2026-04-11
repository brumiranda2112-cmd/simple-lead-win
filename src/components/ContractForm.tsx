import { useState } from 'react';
import { Installment } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSave: () => void;
}

export function ContractForm({ open, onOpenChange, leadId, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<Omit<Installment, 'id' | 'status' | 'paidAt' | 'transactionId'>[]>([]);
  const [autoCount, setAutoCount] = useState('');
  const [error, setError] = useState('');

  const lead = storage.getLead(leadId);

  const generateEqualInstallments = () => {
    const count = parseInt(autoCount);
    const total = parseFloat(totalValue);
    if (!count || count < 1 || !total || total <= 0) {
      toast.error('Informe o valor total e a quantidade de parcelas');
      return;
    }
    const baseValue = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - baseValue * count) * 100) / 100;
    const now = new Date();
    const newInstallments = Array.from({ length: count }, (_, i) => {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      return {
        description: `Parcela ${i + 1}/${count}`,
        value: i === 0 ? baseValue + remainder : baseValue,
        dueDate: dueDate.toISOString().split('T')[0],
      };
    });
    setInstallments(newInstallments);
  };

  const addCustomInstallment = () => {
    setInstallments([...installments, { description: `Parcela ${installments.length + 1}`, value: 0, dueDate: '' }]);
  };

  const updateInstallment = (index: number, field: string, value: string | number) => {
    setInstallments(installments.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const removeInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const installmentsTotal = installments.reduce((sum, inst) => sum + (Number(inst.value) || 0), 0);
  const totalNum = parseFloat(totalValue) || 0;
  const diff = Math.round((totalNum - installmentsTotal) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Título é obrigatório'); return; }
    if (!totalNum || totalNum <= 0) { setError('Valor total é obrigatório'); return; }
    if (installments.length === 0) { setError('Adicione pelo menos uma parcela'); return; }
    if (installments.some(i => !i.dueDate || !i.value)) { setError('Preencha todas as parcelas'); return; }

    const contractInstallments: Installment[] = installments.map(i => ({
      id: crypto.randomUUID(),
      description: i.description,
      value: Number(i.value),
      dueDate: i.dueDate,
      status: 'pendente',
      paidAt: null,
      transactionId: null,
    }));

    storage.createContract({
      leadId,
      title,
      totalValue: totalNum,
      installments: contractInstallments,
      notes,
    });

    toast.success('Contrato criado com sucesso!');
    onSave();
    onOpenChange(false);
    // reset
    setTitle(''); setTotalValue(''); setNotes(''); setInstallments([]); setAutoCount(''); setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Cobrança — {lead?.name || ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título do Contrato *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Projeto de Automação" />
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={totalValue} onChange={e => setTotalValue(e.target.value)} placeholder="5000" />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes do contrato..." rows={2} />
          </div>

          {/* Auto-generate installments */}
          <div className="border rounded-lg p-3 space-y-3 bg-secondary/30">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gerar Parcelas Iguais</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min="1" max="60" value={autoCount} onChange={e => setAutoCount(e.target.value)} placeholder="Ex: 5" className="h-9" />
              </div>
              <Button type="button" variant="outline" className="h-9" onClick={generateEqualInstallments}>
                <Wand2 className="w-4 h-4 mr-1" /> Gerar
              </Button>
            </div>
          </div>

          {/* Installments list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parcelas ({installments.length})</Label>
              <Button type="button" size="sm" variant="outline" onClick={addCustomInstallment}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>

            {installments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela adicionada. Gere automaticamente ou adicione manualmente.</p>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {installments.map((inst, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center bg-secondary/20 p-2 rounded">
                  <Input
                    value={inst.description}
                    onChange={e => updateInstallment(i, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inst.value || ''}
                    onChange={e => updateInstallment(i, 'value', parseFloat(e.target.value) || 0)}
                    placeholder="Valor"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="date"
                    value={inst.dueDate}
                    onChange={e => updateInstallment(i, 'dueDate', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive/60" onClick={() => removeInstallment(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {installments.length > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Total das parcelas:</span>
                <span className={`font-semibold ${diff !== 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                  R$ {installmentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {diff !== 0 && <span className="text-xs ml-1">({diff > 0 ? `falta R$ ${diff.toFixed(2)}` : `excede R$ ${Math.abs(diff).toFixed(2)}`})</span>}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Criar Contrato</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
