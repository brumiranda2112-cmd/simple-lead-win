import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, TASK_TYPE_LABELS, TaskType } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Phone, Users, FileText, Clock, Bell, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  followup: <Phone className="w-3 h-3" />,
  reuniao: <Users className="w-3 h-3" />,
  proposta: <FileText className="w-3 h-3" />,
  diagnostico: <Clock className="w-3 h-3" />,
  lembrete: <Bell className="w-3 h-3" />,
  mensagem: <MessageSquare className="w-3 h-3" />,
};

const TYPE_COLORS: Record<TaskType, string> = {
  followup: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  reuniao: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  proposta: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  diagnostico: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  lembrete: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  mensagem: 'border-green-500/30 bg-green-500/10 text-green-400',
};

interface Props {
  tasks: Task[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  getLeadName: (leadId: string) => string;
}

export function WeeklyAgenda({ tasks, weekStart, onWeekChange, onComplete, onDelete, getLeadName }: Props) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const tasksByDay = useMemo(() => {
    return weekDays.map(day => ({
      date: day,
      tasks: tasks
        .filter(t => {
          try { return isSameDay(parseISO(t.dueDate), day); }
          catch { return false; }
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    }));
  }, [weekDays, tasks]);

  const isOverdue = (t: Task) => !t.completed && t.dueDate.split('T')[0] < todayStr;
  const isToday = (date: Date) => isSameDay(date, today);

  const prevWeek = () => onWeekChange(addDays(weekStart, -7));
  const nextWeek = () => onWeekChange(addDays(weekStart, 7));
  const goToday = () => onWeekChange(today);

  const weekLabel = `${format(weekDays[0], "d MMM", { locale: ptBR })} — ${format(weekDays[6], "d MMM yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>Hoje</Button>
        </div>
        <span className="text-sm font-medium capitalize">{weekLabel}</span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {tasksByDay.map(({ date, tasks: dayTasks }) => (
          <div
            key={date.toISOString()}
            className={cn(
              'rounded-xl border min-h-[280px] flex flex-col',
              isToday(date)
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-card/50'
            )}
          >
            {/* Day header */}
            <div className={cn(
              'px-2 py-2 text-center border-b',
              isToday(date) ? 'border-primary/20' : 'border-border/50'
            )}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {format(date, 'EEE', { locale: ptBR })}
              </p>
              <p className={cn(
                'text-lg font-bold',
                isToday(date) ? 'text-primary' : 'text-foreground'
              )}>
                {format(date, 'd')}
              </p>
              {dayTasks.length > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {dayTasks.length}
                </Badge>
              )}
            </div>

            {/* Tasks */}
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[400px]">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    'rounded-lg border p-1.5 text-[11px] transition-all group',
                    isOverdue(task)
                      ? 'border-destructive/40 bg-destructive/10'
                      : task.completed
                      ? 'border-border/30 opacity-50'
                      : TYPE_COLORS[task.type as TaskType]
                  )}
                >
                  <div className="flex items-start gap-1">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => onComplete(task.id)}
                      className="h-3.5 w-3.5 mt-0.5 shrink-0"
                      disabled={task.completed}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        {TYPE_ICONS[task.type as TaskType]}
                        <span className={cn('font-medium truncate', task.completed && 'line-through')}>
                          {task.title}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">{getLeadName(task.leadId)}</p>
                      <p className="text-muted-foreground">
                        {new Date(task.dueDate).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive shrink-0"
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
