import { useState } from 'react';
import { TaskType, TaskPriority, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, Subtask } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSave: () => void;
  task?: ReturnType<typeof storage.getTask>;
}

export function TaskForm({ open, onOpenChange, leadId, onSave, task }: Props) {
  const [type, setType] = useState<TaskType>(task?.type || 'followup');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'media');
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: crypto.randomUUID(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) { setError('Título e data são obrigatórios'); return; }
    if (task) {
      storage.updateTask(task.id, { type, priority, title, description, dueDate, subtasks });
    } else {
      storage.createTask({ leadId, type, priority, title, description, dueDate, subtasks });
    }
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as TaskType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ligar para João" />
          </div>
          <div className="space-y-2">
            <Label>Data/Hora *</Label>
            <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes..." rows={2} />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label>Subtarefas / Checklist</Label>
            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={st.completed}
                    onCheckedChange={(checked) => setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !!checked } : s))}
                    className="h-4 w-4"
                  />
                  <span className={st.completed ? 'line-through text-muted-foreground' : ''}>{st.title}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-5 w-5 ml-auto text-destructive/60" onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Nova subtarefa..."
                className="h-8 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addSubtask}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
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
