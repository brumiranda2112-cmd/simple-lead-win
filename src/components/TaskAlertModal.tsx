import { useEffect, useState } from 'react';
import * as storage from '@/lib/storage';
import { Task, TASK_TYPE_LABELS, TaskType } from '@/types/crm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';

export function TaskAlertModal() {
  const [open, setOpen] = useState(false);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [today, setToday] = useState<Task[]>([]);

  useEffect(() => {
    const o = storage.getOverdueTasks();
    const t = storage.getTodayTasks();
    if (o.length > 0 || t.length > 0) {
      setOverdue(o);
      setToday(t);
      setOpen(true);
    }
  }, []);

  const leads = storage.getLeads();
  const getLeadName = (id: string) => leads.find(l => l.id === id)?.name || '';

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Atenção!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-destructive mb-2">Tarefas Atrasadas ({overdue.length})</h4>
              <div className="space-y-2">
                {overdue.map(t => (
                  <div key={t.id} className="p-2 rounded bg-destructive/10 border border-destructive/20 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{getLeadName(t.leadId)} • {TASK_TYPE_LABELS[t.type as TaskType]} • {new Date(t.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {today.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-warning flex items-center gap-1 mb-2"><Clock className="w-4 h-4" />Tarefas de Hoje ({today.length})</h4>
              <div className="space-y-2">
                {today.map(t => (
                  <div key={t.id} className="p-2 rounded bg-warning/10 border border-warning/20 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{getLeadName(t.leadId)} • {TASK_TYPE_LABELS[t.type as TaskType]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
