import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Lead, PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadResponsible } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadForm } from '@/components/LeadForm';
import { LeadDetails } from '@/components/LeadDetails';
import { Plus, Phone, DollarSign, Clock, User, MessageCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>(storage.getLeads());
  const [formOpen, setFormOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [reasonModal, setReasonModal] = useState<{ leadId: string; status: string } | null>(null);
  const [reason, setReason] = useState('');

  const refresh = () => setLeads(storage.getLeads());

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_COLUMNS.forEach(c => { map[c.status] = []; });
    leads.forEach(l => { if (map[l.status]) map[l.status].push(l); });
    return map;
  }, [leads]);

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

  const formatCurrency = (v: number) => v ? `R$ ${(v / 1000).toFixed(0)}k` : '';

  const colTotal = (items: Lead[]) => items.reduce((s, l) => s + (l.estimatedValue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Lead</Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {PIPELINE_COLUMNS.map(col => {
            const items = grouped[col.status] || [];
            const total = colTotal(items);
            return (
              <div key={col.status} className="min-w-[220px] w-[220px] flex flex-col shrink-0">
                {/* Column header */}
                <div className="rounded-t-lg px-3 py-2 mb-2" style={{ backgroundColor: col.color + '20', borderBottom: `2px solid ${col.color}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  {total > 0 && <p className="text-xs text-muted-foreground mt-1">R$ {total.toLocaleString('pt-BR')}</p>}
                </div>

                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-1 rounded-b-lg transition-colors ${snapshot.isDraggingOver ? 'bg-secondary/50' : ''}`}
                    >
                      {items.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 cursor-pointer hover:border-primary/40 transition-all ${snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''}`}
                              onClick={() => setDetailLead(lead)}
                            >
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />{lead.phone}
                                {lead.phone && (
                                  <button
                                    onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone); }}
                                    className="ml-auto text-emerald-500 hover:text-emerald-400 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />{LEAD_RESPONSIBLE_LABELS[lead.responsible as LeadResponsible] || '-'}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                {lead.estimatedValue > 0 && (
                                  <span className="text-xs flex items-center gap-1 text-primary"><DollarSign className="w-3 h-3" />{formatCurrency(lead.estimatedValue)}</span>
                                )}
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

      <LeadForm open={formOpen} onOpenChange={setFormOpen} onSave={data => { storage.createLead(data); refresh(); }} />

      {detailLead && (
        <LeadDetails lead={detailLead} open={!!detailLead} onOpenChange={o => { if (!o) setDetailLead(null); }} onRefresh={() => { refresh(); setDetailLead(storage.getLead(detailLead.id) || null); }} />
      )}

      {/* Reason modal for Finalizado */}
      <Dialog open={!!reasonModal} onOpenChange={o => { if (!o) setReasonModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>✅ Cliente Finalizado!</DialogTitle>
          </DialogHeader>
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
    </div>
  );
}
