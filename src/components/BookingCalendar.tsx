import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isSameMonth, parseISO, getHours, getMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  appointment_types: { name: string; color: string } | null;
}

type ViewMode = 'week' | 'month';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h - 19h

export function BookingCalendar({ bookings }: { bookings: Booking[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const monthStart = startOfWeek(start, { weekStartsOn: 0 });
    const monthEnd = endOfWeek(end, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  const getBookingsForDay = (day: Date) =>
    activeBookings.filter(b => isSameDay(parseISO(b.start_time), day))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const navigate = (dir: number) => {
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, dir));
    else setCurrentDate(d => addMonths(d, dir));
  };

  const goToday = () => setCurrentDate(new Date());

  const title = viewMode === 'week'
    ? `${format(weekDays[0], "dd MMM", { locale: ptBR })} – ${format(weekDays[6], "dd MMM yyyy", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          <h2 className="text-lg font-semibold capitalize ml-2">{title}</h2>
        </div>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          <Button variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('week')}>
            <CalendarDays className="w-4 h-4 mr-1" />Semana
          </Button>
          <Button variant={viewMode === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>
            <LayoutGrid className="w-4 h-4 mr-1" />Mês
          </Button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Header */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-secondary/30">
            <div className="p-2 border-r" />
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn("p-2 text-center border-r last:border-r-0", isToday && "bg-primary/10")}>
                  <p className="text-xs text-muted-foreground uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className={cn("text-lg font-bold", isToday && "text-primary")}>{format(day, 'd')}</p>
                </div>
              );
            })}
          </div>
          {/* Time Grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ minHeight: HOURS.length * 60 }}>
            {/* Hour labels */}
            <div className="border-r">
              {HOURS.map(h => (
                <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDays.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn("relative border-r last:border-r-0", isToday && "bg-primary/5")}>
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} className="h-[60px] border-b border-dashed border-border/50" />
                  ))}
                  {/* Booking blocks */}
                  {dayBookings.map(booking => {
                    const start = parseISO(booking.start_time);
                    const end = parseISO(booking.end_time);
                    const startH = getHours(start) + getMinutes(start) / 60;
                    const endH = getHours(end) + getMinutes(end) / 60;
                    const top = (startH - HOURS[0]) * 60;
                    const height = Math.max((endH - startH) * 60, 24);
                    const color = booking.appointment_types?.color || '#f97316';

                    return (
                      <div
                        key={booking.id}
                        className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 cursor-pointer overflow-hidden text-white transition-all hover:opacity-90 hover:shadow-lg z-10"
                        style={{ top, height, backgroundColor: color, minHeight: 24 }}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <p className="text-[10px] font-bold truncate leading-tight">{booking.client_name}</p>
                        {height > 30 && (
                          <p className="text-[9px] opacity-90 truncate">
                            {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                          </p>
                        )}
                        {height > 46 && booking.appointment_types && (
                          <p className="text-[9px] opacity-80 truncate">{booking.appointment_types.name}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="grid grid-cols-7 bg-secondary/30">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase border-r last:border-r-0">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayBookings = getBookingsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1",
                    !isCurrentMonth && "opacity-40",
                    isToday && "bg-primary/5"
                  )}
                >
                  <p className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(b => (
                      <div
                        key={b.id}
                        className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer text-white hover:opacity-80"
                        style={{ backgroundColor: b.appointment_types?.color || '#f97316' }}
                        onClick={() => setSelectedBooking(b)}
                      >
                        {format(parseISO(b.start_time), 'HH:mm')} {b.client_name}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{dayBookings.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking detail popover */}
      {selectedBooking && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{selectedBooking.client_name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>✕</Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Telefone:</span> {selectedBooking.client_phone}</p>
            {selectedBooking.client_email && <p><span className="text-muted-foreground">Email:</span> {selectedBooking.client_email}</p>}
            <p><span className="text-muted-foreground">Tipo:</span> {selectedBooking.appointment_types?.name || '-'}</p>
            <p><span className="text-muted-foreground">Horário:</span> {format(parseISO(selectedBooking.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} – {format(parseISO(selectedBooking.end_time), "HH:mm")}</p>
            {selectedBooking.notes && <p><span className="text-muted-foreground">Obs:</span> {selectedBooking.notes}</p>}
            <Badge className={selectedBooking.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : selectedBooking.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}>
              {selectedBooking.status === 'confirmed' ? 'Confirmado' : selectedBooking.status === 'completed' ? 'Concluído' : 'Cancelado'}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
