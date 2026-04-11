import { Lead, LEAD_STATUS_LABELS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_RESPONSIBLE_LABELS, PIPELINE_COLUMNS, LeadArea, LeadSource, LeadResponsible, INSTALLMENT_STATUS_LABELS, INSTALLMENT_STATUS_COLORS, Contract } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, Building2, Clock, DollarSign, FileText, ArrowRight, Plus, CheckCircle, User, MessageCircle, Receipt, Undo2, Trash2 } from 'lucide-react';
import { TaskForm } from '@/components/TaskForm';
import { ContractForm } from '@/components/ContractForm';
const openWhatsApp = (phone: string) => window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function LeadDetails({ lead, open, onOpenChange, onRefresh }: Props) {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const activities = storage.getLeadActivities(lead.id);
  const tasks = storage.getTasks().filter(t => t.leadId === lead.id);
  const contracts = storage.getContractsByLead(lead.id);
  const col = PIPELINE_COLUMNS.find(c => c.status === lead.status);

  const moveToStatus = (status: string) => {
    if (status === 'finalizado') {
      const reason = prompt('Observações finais do projeto:');
      if (reason === null) return;
      storage.moveLeadStatus(lead.id, status as Lead['status'], reason);
    } else {
      storage.moveLeadStatus(lead.id, status as Lead['status']);
    }
    onRefresh();
  };

  const handlePayInstallment = (contractId: string, installmentId: string) => {
    const result = storage.markInstallmentPaid(contractId, installmentId);
    if (result) {
      toast.success(`Parcela marcada como paga! Receita de R$ ${result.transaction.value.toLocaleString('pt-BR')} registrada.`);
      onRefresh();
    }
  };

  const handleUnpayInstallment = (contractId: string, installmentId: string) => {
    storage.markInstallmentUnpaid(contractId, installmentId);
    toast.success('Pagamento estornado');
    onRefresh();
  };

  const handleDeleteContract = (contractId: string) => {
    if (!confirm('Deletar este contrato? As parcelas pagas continuarão no financeiro.')) return;
    storage.deleteContract(contractId);
    toast.success('Contrato removido');
    onRefresh();
  };

  const getInstallmentDisplayStatus = (inst: Contract['installments'][0]) => {
    if (inst.status === 'pago') return 'pago';
    if (inst.status === 'cancelado') return 'cancelado';
    if (new Date(inst.dueDate) < new Date() && inst.status === 'pendente') return 'atrasado';
    return 'pendente';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {lead.name}
              <Badge style={{ backgroundColor: col?.color, color: '#fff' }}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />{lead.phone}
              {lead.phone && (
                <Button size="sm" variant="ghost" className="text-emerald-500 hover:text-emerald-400 h-7 px-2" onClick={() => openWhatsApp(lead.phone)}>
                  <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
                </Button>
              )}
            </div>
            {lead.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{lead.email}</div>}
            {lead.company && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" />{lead.company}</div>}
            <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" />R$ {lead.estimatedValue.toLocaleString('pt-BR')}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4" />{LEAD_AREA_LABELS[lead.area as LeadArea]}</div>
            <div className="flex items-center gap-2 text-muted-foreground">Origem: {LEAD_SOURCE_LABELS[lead.source as LeadSource]}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" />Responsável: {LEAD_RESPONSIBLE_LABELS[lead.responsible as LeadResponsible] || '-'}</div>
            {lead.nextFollowup && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />{new Date(lead.nextFollowup).toLocaleString('pt-BR')}</div>}
          </div>
          {lead.notes && <p className="text-sm bg-secondary/50 p-3 rounded-lg">{lead.notes}</p>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setTaskFormOpen(true)}><Plus className="w-3 h-3 mr-1" />Nova Tarefa</Button>
            <Button size="sm" variant="outline" onClick={() => setContractFormOpen(true)}><Receipt className="w-3 h-3 mr-1" />Nova Cobrança</Button>
            {lead.status !== 'finalizado' && <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => moveToStatus('finalizado')}><CheckCircle className="w-3 h-3 mr-1" />Finalizar</Button>}
            {PIPELINE_COLUMNS.filter(c => c.status !== lead.status && c.status !== 'finalizado').map(c => (
              <Button key={c.status} size="sm" variant="ghost" className="text-xs" onClick={() => moveToStatus(c.status)}>
                <ArrowRight className="w-3 h-3 mr-1" />{c.label}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Contracts / Billing Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Cobranças ({contracts.length})
            </h3>
            {contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma cobrança cadastrada</p>
            ) : (
              <div className="space-y-3">
                {contracts.map(contract => {
                  const paid = contract.installments.filter(i => i.status === 'pago').reduce((s, i) => s + i.value, 0);
                  const paidCount = contract.installments.filter(i => i.status === 'pago').length;
                  const progress = contract.totalValue > 0 ? Math.round((paid / contract.totalValue) * 100) : 0;

                  return (
                    <div key={contract.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{contract.title}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {paid.toLocaleString('pt-BR')} / R$ {contract.totalValue.toLocaleString('pt-BR')} — {paidCount}/{contract.installments.length} parcelas
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={progress === 100 ? 'default' : 'outline'} className={progress === 100 ? 'bg-emerald-600' : ''}>
                            {progress}%
                          </Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60" onClick={() => handleDeleteContract(contract.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>

                      {/* Installments */}
                      <div className="space-y-1">
                        {contract.installments.map(inst => {
                          const displayStatus = getInstallmentDisplayStatus(inst);
                          return (
                            <div key={inst.id} className="flex items-center justify-between text-sm bg-secondary/30 p-2 rounded gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="truncate block">{inst.description}</span>
                                <span className="text-xs text-muted-foreground">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <span className="font-medium text-xs shrink-0">R$ {inst.value.toLocaleString('pt-BR')}</span>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${INSTALLMENT_STATUS_COLORS[displayStatus]}`}>
                                {INSTALLMENT_STATUS_LABELS[displayStatus]}
                              </Badge>
                              {displayStatus !== 'pago' && displayStatus !== 'cancelado' && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-500 hover:text-emerald-400 shrink-0" onClick={() => handlePayInstallment(contract.id, inst.id)}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Pagar
                                </Button>
                              )}
                              {displayStatus === 'pago' && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleUnpayInstallment(contract.id, inst.id)}>
                                  <Undo2 className="w-3.5 h-3.5 mr-1" /> Estornar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Tarefas ({tasks.length})</h3>
            {tasks.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma tarefa</p> : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-secondary/30 p-2 rounded">
                    <span className={t.completed ? 'line-through text-muted-foreground' : ''}>{t.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Histórico</h3>
            {activities.length === 0 ? <p className="text-xs text-muted-foreground">Sem atividades</p> : (
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p>{a.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TaskForm open={taskFormOpen} onOpenChange={setTaskFormOpen} leadId={lead.id} onSave={() => { onRefresh(); }} />
      <ContractForm open={contractFormOpen} onOpenChange={setContractFormOpen} leadId={lead.id} onSave={() => { onRefresh(); }} />
    </>
  );
}
