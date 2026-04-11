import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Lead, PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_RESPONSIBLE_LABELS, CLIENT_PIPELINE_STATUS_LABELS, LeadArea, LeadResponsible, ClientPipelineStatus } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadForm } from '@/components/LeadForm';
import { LeadDetails } from '@/components/LeadDetails';
import { TaskForm } from '@/components/TaskForm';
import { Plus, Phone, DollarSign, Clock, User, MessageCircle, Search, Eye, Pencil, Trash2, Kanban, List, CheckSquare } from 'lucide-react';
const openWhatsApp = (phone: string) => window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>(storage.getLeadsByType('cliente'));
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [reasonModal, setReasonModal] = useState<{ leadId: string; status: string } | null>(null);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [taskLeadId, setTaskLeadId] = useState<string | null>(null);

  const refresh = useCallback(() => setLeads(storage.getLeadsByType('cliente')), []);

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_COLUMNS.forEach(c => { map[c.status] = []; });
    leads.forEach(l => { if (map[l.status]) map[l.status].push(l); });
    return map;
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q);
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leads, search, filterStatus]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const leadId = result.draggableId;
    if (newStatus === 'finalizado') {
      setReasonModal({ leadId, status: newStatus });
      return;
    }
    storage.moveLeadStatus(leadId, newStatus as Lead['status']);
    refresh();
  };

  const confirmReason = () => {
    if (reasonModal) {
      storage.moveLeadStatus(reasonModal.leadId, reasonModal.status as Lead['status'], reason);
      setReasonModal(null);
      setReason('');
      refresh();
    }
  };

  const handleSave = (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editLead) {
      storage.updateLead(editLead.id, data);
    } else {
      storage.createLead({ ...data, leadType: 'cliente', status: 'cliente_novo' as any });
    }
    setEditLead(null);
    refresh();
  };

  const handleDelete = () => {
    if (deleteId) { storage.deleteLead(deleteId); setDeleteId(null); refresh(); }
  };

  const formatCurrency = (v: number) => v ? `R$ ${(v / 1000).toFixed(0)}k` : '';
  const colTotal = (items: Lead[]) => items.reduce((s, l) => s + (l.estimatedValue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => { setEditLead(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Cliente</Button>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline"><Kanban className="w-4 h-4 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="lista"><List className="w-4 h-4 mr-1" />Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
              {PIPELINE_COLUMNS.map(col => {
                const items = grouped[col.status] || [];
                const total = colTotal(items);
                return (
                  <div key={col.status} className="min-w-[220px] w-[220px] flex flex-col shrink-0">
                    <div className="rounded-t-lg px-3 py-2 mb-2" style={{ backgroundColor: col.color + '20', borderBottom: `2px solid ${col.color}` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      </div>
                      {total > 0 && <p className="text-xs text-muted-foreground mt-1">R$ {total.toLocaleString('pt-BR')}</p>}
                    </div>
                    <Droppable droppableId={col.status}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 space-y-2 p-1 rounded-b-lg transition-colors ${snapshot.isDraggingOver ? 'bg-secondary/50' : ''}`}>
                          {items.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <Card ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                  className={`p-3 cursor-pointer hover:border-primary/40 transition-all group ${snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''}`}
                                  onClick={() => setDetailLead(lead)}>
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm truncate flex-1">{lead.name}</p>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => { e.stopPropagation(); setEditLead(lead); setFormOpen(true); }}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3" />{lead.phone}
                                    {lead.phone && (
                                      <button onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone); }} className="ml-auto text-emerald-500 hover:text-emerald-400 transition-colors" title="WhatsApp">
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />{LEAD_RESPONSIBLE_LABELS[lead.responsible as LeadResponsible] || '-'}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    {lead.estimatedValue > 0 && <span className="text-xs flex items-center gap-1 text-primary"><DollarSign className="w-3 h-3" />{formatCurrency(lead.estimatedValue)}</span>}
                                    <Badge variant="outline" className="text-[10px]">{LEAD_AREA_LABELS[lead.area as LeadArea]}</Badge>
                                  </div>
                                  {lead.nextFollowup && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                                      <Clock className="w-3 h-3" />{new Date(lead.nextFollowup).toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(CLIENT_PIPELINE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhum cliente encontrado</TableCell></TableRow>
                ) : filtered.map(lead => (
                  <TableRow key={lead.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => setDetailLead(lead)}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell><Badge variant="outline">{LEAD_RESPONSIBLE_LABELS[lead.responsible as LeadResponsible] || '-'}</Badge></TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell><Badge variant="outline">{LEAD_AREA_LABELS[lead.area as LeadArea]}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{CLIENT_PIPELINE_STATUS_LABELS[lead.status as ClientPipelineStatus] || lead.status}</Badge></TableCell>
                    <TableCell>{lead.estimatedValue ? `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {lead.phone && <Button size="icon" variant="ghost" className="text-emerald-500 hover:text-emerald-400" onClick={() => openWhatsApp(lead.phone)}><MessageCircle className="w-4 h-4" /></Button>}
                        <Button size="icon" variant="ghost" onClick={() => { setEditLead(lead); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(lead.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <LeadForm open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditLead(null); }} lead={editLead} onSave={handleSave} defaultLeadType="cliente" />

      {detailLead && (
        <LeadDetails lead={detailLead} open={!!detailLead} onOpenChange={o => { if (!o) setDetailLead(null); }} onRefresh={() => { refresh(); setDetailLead(storage.getLead(detailLead.id) || null); }} />
      )}

      <Dialog open={!!reasonModal} onOpenChange={o => { if (!o) setReasonModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>✅ Cliente Finalizado!</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Observações finais</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva como foi o projeto..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonModal(null)}>Cancelar</Button>
            <Button onClick={confirmReason}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
