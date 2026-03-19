import { Lead, LEAD_STATUS_LABELS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, PIPELINE_COLUMNS, LeadArea, LeadSource } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, Building2, Clock, DollarSign, FileText, ArrowRight, Plus, CheckCircle, XCircle } from 'lucide-react';
import { TaskForm } from '@/components/TaskForm';
import { useState } from 'react';

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function LeadDetails({ lead, open, onOpenChange, onRefresh }: Props) {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const activities = storage.getLeadActivities(lead.id);
  const tasks = storage.getTasks().filter(t => t.leadId === lead.id);
  const col = PIPELINE_COLUMNS.find(c => c.status === lead.status);

  const moveToStatus = (status: string) => {
    if (status === 'ganho' || status === 'perdido') {
      const reason = prompt(status === 'ganho' ? 'Motivo do ganho:' : 'Motivo da perda:');
      if (reason === null) return;
      storage.moveLeadStatus(lead.id, status as Lead['status'], reason);
    } else {
      storage.moveLeadStatus(lead.id, status as Lead['status']);
    }
    onRefresh();
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

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{lead.phone}</div>
            {lead.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{lead.email}</div>}
            {lead.company && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-4 h-4" />{lead.company}</div>}
            <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" />R$ {lead.estimatedValue.toLocaleString('pt-BR')}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4" />{LEAD_AREA_LABELS[lead.area as LeadArea]}</div>
            <div className="flex items-center gap-2 text-muted-foreground">Origem: {LEAD_SOURCE_LABELS[lead.source as LeadSource]}</div>
            {lead.nextFollowup && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />{new Date(lead.nextFollowup).toLocaleString('pt-BR')}</div>}
          </div>
          {lead.notes && <p className="text-sm bg-secondary/50 p-3 rounded-lg">{lead.notes}</p>}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setTaskFormOpen(true)}><Plus className="w-3 h-3 mr-1" />Follow-up</Button>
            {lead.status !== 'ganho' && <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => moveToStatus('ganho')}><CheckCircle className="w-3 h-3 mr-1" />Ganho</Button>}
            {lead.status !== 'perdido' && <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => moveToStatus('perdido')}><XCircle className="w-3 h-3 mr-1" />Perdido</Button>}
            {PIPELINE_COLUMNS.filter(c => c.status !== lead.status && c.status !== 'ganho' && c.status !== 'perdido').map(c => (
              <Button key={c.status} size="sm" variant="ghost" className="text-xs" onClick={() => moveToStatus(c.status)}>
                <ArrowRight className="w-3 h-3 mr-1" />{c.label}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Tasks */}
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

          {/* Activity timeline */}
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
    </>
  );
}
