import { useState, useMemo } from 'react';
import { format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TaskType, TaskPriority, TaskComment } from '@/types/crm';
import * as storage from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskForm } from '@/components/TaskForm';
import { Calendar } from '@/components/ui/calendar';
import { WeeklyAgenda } from '@/components/WeeklyAgenda';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, AlertTriangle, CheckCircle2, Trash2, CalendarDays, List, MessageSquare, Users, FileText, Bell, Phone, CalendarRange, Send, ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

type Filter = 'all' | 'today' | 'overdue' | 'completed';
type PriorityFilter = 'all' | TaskPriority;

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  followup: <Phone className="w-3.5 h-3.5" />,
  reuniao: <Users className="w-3.5 h-3.5" />,
  proposta: <FileText className="w-3.5 h-3.5" />,
  diagnostico: <Clock className="w-3.5 h-3.5" />,
  lembrete: <Bell className="w-3.5 h-3.5" />,
  mensagem: <MessageSquare className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<TaskType, string> = {
  followup: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  reuniao: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  proposta: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  diagnostico: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  lembrete: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  mensagem: 'text-green-400 bg-green-400/10 border-green-400/20',
};

export default function Tasks() {
  useTaskNotifications();

  const [tasks, setTasks] = useState<Task[]>(storage.getTasks());
  const [filter, setFilter] = useState<Filter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const leads = storage.getLeads();
  const today = new Date().toISOString().split('T')[0];

  const refresh = () => setTasks(storage.getTasks());

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filter === 'today') return !t.completed && t.dueDate.split('T')[0] === today;
      if (filter === 'overdue') return !t.completed && t.dueDate.split('T')[0] < today;
      if (filter === 'completed') return t.completed;
      if (filter === 'all') return !t.completed;
      return true;
    }).filter(t => priorityFilter === 'all' || t.priority === priorityFilter)
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, filter, priorityFilter, today]);

  const selectedDayTasks = useMemo(() => {
    return tasks
      .filter(t => {
        try { return isSameDay(parseISO(t.dueDate), selectedDate); }
        catch { return false; }
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, selectedDate]);

  const taskDates = useMemo(() => {
    const dates = new Map<string, { count: number; hasOverdue: boolean }>();
    tasks.forEach(t => {
      const key = t.dueDate.split('T')[0];
      const existing = dates.get(key) || { count: 0, hasOverdue: false };
      existing.count++;
      if (!t.completed && key < today) existing.hasOverdue = true;
      dates.set(key, existing);
    });
    return dates;
  }, [tasks, today]);

  const handleComplete = (id: string) => { storage.completeTask(id); refresh(); };
  const handleDelete = (id: string) => { storage.deleteTask(id); refresh(); };

  const handleSubtaskToggle = (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    storage.updateTask(taskId, { subtasks: updatedSubtasks });
    refresh();
  };

  const handleAddComment = (taskId: string) => {
    if (!commentText.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const comment: TaskComment = {
      id: crypto.randomUUID(),
      text: commentText.trim(),
      author: 'Você',
      createdAt: new Date().toISOString(),
    };
    storage.updateTask(taskId, { comments: [...(task.comments || []), comment] });
    setCommentText('');
    refresh();
  };

  const isOverdue = (t: Task) => !t.completed && t.dueDate.split('T')[0] < today;
  const isToday = (t: Task) => !t.completed && t.dueDate.split('T')[0] === today;
  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.name || 'Lead removido';

  const overdue = tasks.filter(t => isOverdue(t)).length;
  const todayCount = tasks.filter(t => isToday(t)).length;
  const pending = tasks.filter(t => !t.completed).length;
  const urgentCount = tasks.filter(t => !t.completed && t.priority === 'urgente').length;

  const TaskItem = ({ task }: { task: Task }) => {
    const isExpanded = expandedTask === task.id;
    const subtasksDone = (task.subtasks || []).filter(s => s.completed).length;
    const subtasksTotal = (task.subtasks || []).length;
    const commentsCount = (task.comments || []).length;

    return (
      <div className={cn(
        'rounded-lg border transition-all',
        isOverdue(task) ? 'border-destructive/40 bg-destructive/5' :
        isToday(task) ? 'border-amber-500/40 bg-amber-500/5' :
        task.completed ? 'border-border/50 bg-muted/30 opacity-60' :
        'border-border bg-card hover:bg-accent/5'
      )}>
        <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => handleComplete(task.id)}
            className="h-5 w-5 shrink-0"
            disabled={task.completed}
            onClick={e => e.stopPropagation()}
          />
          <div className={cn('p-1.5 rounded-md border shrink-0', TYPE_COLORS[task.type as TaskType])}>
            {TYPE_ICONS[task.type as TaskType]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('font-medium text-sm truncate', task.completed && 'line-through text-muted-foreground')}>
                {task.title}
              </span>
              <Badge variant="outline" className={cn('text-[10px] shrink-0 px-1.5', TASK_PRIORITY_COLORS[task.priority])}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
              {isOverdue(task) && <Badge variant="destructive" className="text-[10px] shrink-0">Atrasada</Badge>}
              {isToday(task) && <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0">Hoje</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="truncate">{getLeadName(task.leadId)}</span>
              <span className="shrink-0">{new Date(task.dueDate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              {subtasksTotal > 0 && <span className="shrink-0">✓ {subtasksDone}/{subtasksTotal}</span>}
              {commentsCount > 0 && <span className="shrink-0">💬 {commentsCount}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Button size="icon" variant="ghost" className="text-destructive/60 hover:text-destructive h-8 w-8" onClick={e => { e.stopPropagation(); handleDelete(task.id); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border/50 pt-3 space-y-3">
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

            {/* Subtasks */}
            {subtasksTotal > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Subtarefas</span>
                  <Progress value={subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal}</span>
                </div>
                {(task.subtasks || []).map(st => (
                  <div key={st.id} className="flex items-center gap-2 text-sm pl-2">
                    <Checkbox checked={st.completed} onCheckedChange={() => handleSubtaskToggle(task.id, st.id)} className="h-3.5 w-3.5" />
                    <span className={st.completed ? 'line-through text-muted-foreground' : ''}>{st.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-2">
              <span className="text-xs font-medium">Comentários</span>
              {(task.comments || []).map(c => (
                <div key={c.id} className="bg-muted/50 rounded-md p-2 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{c.author}</span>
                    <span>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={expandedTask === task.id ? commentText : ''}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Adicionar comentário..."
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task.id); }}
                />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => handleAddComment(task.id)}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas & Agenda</h1>
        <Button onClick={() => setFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />Pendentes: <span className="text-foreground font-medium">{pending}</span></div>
        <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" />Atrasadas: <span className="font-medium">{overdue}</span></div>
        <div className="flex items-center gap-2 text-primary"><CheckCircle2 className="w-4 h-4" />Hoje: <span className="font-medium">{todayCount}</span></div>
        {urgentCount > 0 && <div className="flex items-center gap-2 text-red-400"><Inbox className="w-4 h-4" />Urgentes: <span className="font-medium">{urgentCount}</span></div>}
      </div>

      {/* Notification permission hint */}
      {'Notification' in window && Notification.permission === 'default' && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-muted-foreground">
            Ative as notificações para receber alertas 15 min antes das tarefas.
          </span>
          <Button size="sm" variant="outline" className="ml-auto shrink-0 text-xs" onClick={() => Notification.requestPermission()}>
            Ativar
          </Button>
        </div>
      )}

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="inbox" className="gap-2"><Inbox className="w-4 h-4" />Inbox</TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2"><CalendarDays className="w-4 h-4" />Dia</TabsTrigger>
          <TabsTrigger value="semana" className="gap-2"><CalendarRange className="w-4 h-4" />Semana</TabsTrigger>
          <TabsTrigger value="lista" className="gap-2"><List className="w-4 h-4" />Lista</TabsTrigger>
        </TabsList>

        {/* ===== INBOX TAB ===== */}
        <TabsContent value="inbox" className="mt-4 space-y-6">
          {/* Overdue */}
          {overdue > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Atrasadas ({overdue})
              </h3>
              <div className="space-y-2">
                {tasks.filter(t => isOverdue(t)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}

          {/* Today */}
          <div>
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4" /> Hoje ({todayCount})
            </h3>
            {todayCount === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">Nenhuma tarefa para hoje 🎉</p>
            ) : (
              <div className="space-y-2">
                {tasks.filter(t => isToday(t)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            )}
          </div>

          {/* Urgent */}
          {urgentCount > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2">
                🔥 Urgentes ({urgentCount})
              </h3>
              <div className="space-y-2">
                {tasks.filter(t => !t.completed && t.priority === 'urgente' && !isOverdue(t) && !isToday(t)).map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== DAY/AGENDA TAB ===== */}
        <TabsContent value="agenda" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                className="p-0 pointer-events-auto"
                modifiers={{
                  hasTasks: (date) => taskDates.has(format(date, 'yyyy-MM-dd')),
                  hasOverdue: (date) => taskDates.get(format(date, 'yyyy-MM-dd'))?.hasOverdue ?? false,
                }}
                modifiersStyles={{
                  hasTasks: { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'hsl(25, 95%, 53%)', textUnderlineOffset: '4px' },
                  hasOverdue: { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'hsl(0, 84%, 60%)', textUnderlineOffset: '4px' },
                }}
              />
              <div className="mt-4 pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-primary rounded" /><span>Dia com tarefas</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-destructive rounded" /><span>Tarefas atrasadas</span></div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold">
                  {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {selectedDayTasks.length} tarefa{selectedDayTasks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {selectedDayTasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma tarefa para este dia</p>
                  <Button variant="link" className="mt-2 text-primary" onClick={() => setFormOpen(true)}>+ Criar tarefa</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayTasks.map(task => <TaskItem key={task.id} task={task} />)}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== WEEK TAB ===== */}
        <TabsContent value="semana" className="mt-4">
          <WeeklyAgenda
            tasks={tasks}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            onComplete={handleComplete}
            onDelete={handleDelete}
            getLeadName={getLeadName}
          />
        </TabsContent>

        {/* ===== LIST TAB ===== */}
        <TabsContent value="lista" className="mt-4">
          <div className="flex gap-3 mb-4 flex-wrap">
            <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Pendentes</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as PriorityFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhuma tarefa encontrada</p>
            ) : filtered.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task form */}
      {formOpen && (
        <>
          {!selectedLeadId ? (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold">Selecione o Lead</h3>
                <Select value={selectedLeadId} onValueChange={v => setSelectedLeadId(v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha um lead..." /></SelectTrigger>
                  <SelectContent>
                    {leads.filter(l => l.status !== 'finalizado').map(l => (
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
