import { useState, useMemo, useCallback } from 'react';
import { Lead, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadSource, LeadStatus, LeadResponsible } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LeadForm } from '@/components/LeadForm';
import { LeadDetails } from '@/components/LeadDetails';
import { Plus, Search, Trash2, Pencil, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(storage.getLeads());
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => setLeads(storage.getLeads()), []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.email.toLowerCase().includes(q);
      const matchArea = filterArea === 'all' || l.area === filterArea;
      const matchSource = filterSource === 'all' || l.source === filterSource;
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      return matchSearch && matchArea && matchSource && matchStatus;
    });
  }, [leads, search, filterArea, filterSource, filterStatus]);

  const handleSave = (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editLead) {
      storage.updateLead(editLead.id, data);
    } else {
      storage.createLead(data);
    }
    setEditLead(null);
    refresh();
  };

  const handleDelete = () => {
    if (deleteId) { storage.deleteLead(deleteId); setDeleteId(null); refresh(); }
  };

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button onClick={() => { setEditLead(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Lead
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone ou email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {Object.entries(LEAD_AREA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Nome</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhum lead encontrado</TableCell></TableRow>
            ) : filtered.map(lead => (
              <TableRow key={lead.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailLead(lead)}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell><Badge variant="outline">{LEAD_RESPONSIBLE_LABELS[lead.responsible as LeadResponsible] || '-'}</Badge></TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell><Badge variant="outline">{LEAD_AREA_LABELS[lead.area as LeadArea]}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status as LeadStatus]}</Badge></TableCell>
                <TableCell>{formatCurrency(lead.estimatedValue)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.nextFollowup ? new Date(lead.nextFollowup).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => setDetailLead(lead)}><Eye className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditLead(lead); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(lead.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LeadForm open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditLead(null); }} lead={editLead} onSave={handleSave} />

      {detailLead && (
        <LeadDetails lead={detailLead} open={!!detailLead} onOpenChange={o => { if (!o) setDetailLead(null); }} onRefresh={() => { refresh(); setDetailLead(storage.getLead(detailLead.id) || null); }} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar lead?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as tarefas e atividades serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
