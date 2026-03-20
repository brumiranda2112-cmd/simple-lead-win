import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Transaction, TransactionType, ExpenseCategory, RevenueCategory, EXPENSE_CATEGORY_LABELS, REVENUE_CATEGORY_LABELS, LEAD_RESPONSIBLE_LABELS, LeadResponsible } from '@/types/crm';
import * as storage from '@/lib/storage';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSave: () => void;
  defaultType?: TransactionType;
}

export function TransactionForm({ open, onOpenChange, transaction, onSave, defaultType = 'despesa' }: Props) {
  const leads = storage.getLeads();
  const [type, setType] = useState<TransactionType>(transaction?.type || defaultType);
  const [category, setCategory] = useState<string>(transaction?.category || (defaultType === 'receita' ? 'contrato' : 'salarios'));
  const [description, setDescription] = useState(transaction?.description || '');
  const [value, setValue] = useState(transaction?.value || 0);
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [leadId, setLeadId] = useState(transaction?.leadId || '');
  const [responsible, setResponsible] = useState(transaction?.responsible || '');
  const [recurring, setRecurring] = useState(transaction?.recurring || false);
  const [notes, setNotes] = useState(transaction?.notes || '');

  const categories = type === 'receita' ? REVENUE_CATEGORY_LABELS : EXPENSE_CATEGORY_LABELS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      type, category: category as ExpenseCategory | RevenueCategory,
      description, value, date, leadId: leadId || undefined,
      responsible: (responsible || undefined) as LeadResponsible | undefined,
      recurring, notes,
    };
    if (transaction) {
      storage.updateTransaction(transaction.id, data);
    } else {
      storage.createTransaction(data);
    }
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar' : 'Nova'} Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType(v as TransactionType); setCategory(v === 'receita' ? 'contrato' : 'salarios'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">💰 Receita</SelectItem>
                  <SelectItem value="despesa">📉 Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Contrato Cliente X" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" value={value} onChange={e => setValue(Number(e.target.value))} min={0} step={0.01} required />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead vinculado</Label>
              <Select value={leadId || 'none'} onValueChange={v => setLeadId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={responsible || 'none'} onValueChange={v => setResponsible(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {Object.entries(LEAD_RESPONSIBLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={recurring} onCheckedChange={setRecurring} />
            <Label>Recorrente (mensal)</Label>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
