import { useState, useMemo } from 'react';
import { Task, TASK_TYPE_LABELS, TaskType } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskForm } from '@/components/TaskForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

type Filter = 'all' | 'today' | 'overdue' | 'completed';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(storage.getTasks());
  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const leads = storage.getLeads();
  const today = new Date().toISOString().split('T')[0];

  const refresh = () => setTasks(storage.getTasks());

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filter === 'today') return !t.completed && t.dueDate.split('T')[0] === today;
      if (filter === 'overdue') return !t.completed && t.dueDate.split('T')[0] < today;
      if (filter === 'completed') return t.completed;
      return !t.completed;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, filter, today]);

  const handleComplete = (id: string) => { storage.completeTask(id); refresh(); };
  const handleDelete = (id: string) => { storage.deleteTask(id); refresh(); };

  const isOverdue = (t: Task) => !t.completed && t.dueDate.split('T')[0] < today;
  const isToday = (t: Task) => !t.completed && t.dueDate.split('T')[0] === today;

  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.name || 'Lead removido';

  const overdue = tasks.filter(t => isOverdue(t)).length;
  const todayCount = tasks.filter(t => isToday(t)).length;
  const pending = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas</h1>
        <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Tarefa</Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />Pendentes: <span className="text-foreground font-medium">{pending}</span></div>
        <div className="flex items-center gap-2 text-warning"><AlertTriangle className="w-4 h-4" />Atrasadas: <span className="font-medium">{overdue}</span></div>
        <div className="flex items-center gap-2 text-primary"><CheckCircle2 className="w-4 h-4" />Hoje: <span className="font-medium">{todayCount}</span></div>
      </div>

      {/* Filter */}
      <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Pendentes</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="overdue">Atrasadas</SelectItem>
          <SelectItem value="completed">Concluídas</SelectItem>
        </SelectContent>
      </Select>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhuma tarefa encontrada</p>
        ) : filtered.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${isOverdue(task) ? 'border-destructive/40 bg-destructive/5' : isToday(task) ? 'border-warning/40 bg-warning/5' : 'border-border bg-card'}`}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => handleComplete(task.id)}
              className="h-5 w-5"
              disabled={task.completed}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                <Badge variant="outline" className="text-[10px]">{TASK_TYPE_LABELS[task.type as TaskType]}</Badge>
                {isOverdue(task) && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
                {isToday(task) && <Badge className="text-[10px] bg-warning text-warning-foreground">Hoje</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{getLeadName(task.leadId)}</span>
                <span>{new Date(task.dueDate).toLocaleString('pt-BR')}</span>
              </div>
              {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
            </div>
            <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDelete(task.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Task form - need to select lead */}
      {formOpen && (
        <>
          {!selectedLeadId ? (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold">Selecione o Lead</h3>
                <Select value={selectedLeadId} onValueChange={v => setSelectedLeadId(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha um lead..." /></SelectTrigger>
                  <SelectContent>
                    {leads.filter(l => l.status !== 'ganho' && l.status !== 'perdido').map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setFormOpen(false); setSelectedLeadId(''); }}>Cancelar</Button>
                </div>
              </div>
            </div>
          ) : (
            <TaskForm
              open={true}
              onOpenChange={o => { if (!o) { setFormOpen(false); setSelectedLeadId(''); } }}
              leadId={selectedLeadId}
              onSave={() => { refresh(); setSelectedLeadId(''); }}
            />
          )}
        </>
      )}
    </div>
  );
}
