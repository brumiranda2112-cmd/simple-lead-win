import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, Settings, Plus, Trash2, Copy, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { BookingCalendar } from '@/components/BookingCalendar';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface AppointmentType {
  id: string; name: string; description: string | null; duration_minutes: number; buffer_minutes: number; color: string; is_active: boolean;
}

interface AvailSetting {
  id: string; day_of_week: number; start_time: string; end_time: string; is_available: boolean;
}

interface Booking {
  id: string; client_name: string; client_email: string | null; client_phone: string; start_time: string; end_time: string; notes: string | null; status: string;
  appointment_types: { name: string; color: string } | null;
}

export default function Agendamentos() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [avail, setAvail] = useState<AvailSetting[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editType, setEditType] = useState<AppointmentType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', duration_minutes: 60, buffer_minutes: 15, color: '#f97316' });

  const loadData = async () => {
    const [b, t, a] = await Promise.all([
      supabase.from('bookings').select('*, appointment_types(name, color)').order('start_time', { ascending: false }),
      supabase.from('appointment_types').select('*').order('created_at'),
      supabase.from('availability_settings').select('*').order('day_of_week'),
    ]);
    if (b.data) setBookings(b.data as any);
    if (t.data) setTypes(t.data);
    if (a.data) setAvail(a.data);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const match = !q || b.client_name.toLowerCase().includes(q) || b.client_phone.includes(q);
    const statusMatch = filterStatus === 'all' || b.status === filterStatus;
    return match && statusMatch;
  });

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    loadData();
    toast.success('Status atualizado');
  };

  const handleSaveType = async () => {
    if (editType) {
      await supabase.from('appointment_types').update(typeForm).eq('id', editType.id);
    } else {
      await supabase.from('appointment_types').insert(typeForm);
    }
    setTypeFormOpen(false);
    setEditType(null);
    setTypeForm({ name: '', description: '', duration_minutes: 60, buffer_minutes: 15, color: '#f97316' });
    loadData();
    toast.success('Tipo salvo');
  };

  const deleteType = async (id: string) => {
    await supabase.from('appointment_types').update({ is_active: false }).eq('id', id);
    loadData();
    toast.success('Tipo removido');
  };

  const updateAvail = async (id: string, updates: Partial<AvailSetting>) => {
    await supabase.from('availability_settings').update(updates).eq('id', id);
    loadData();
  };

  const bookingLink = `${window.location.origin}/agendar`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    toast.success('Link copiado!');
  };

  const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-destructive/20 text-destructive',
    completed: 'bg-primary/20 text-primary',
  };

  const statusLabels: Record<string, string> = {
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    completed: 'Concluído',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendamentos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="w-4 h-4 mr-1" />Copiar Link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/agendar" target="_blank"><ExternalLink className="w-4 h-4 mr-1" />Abrir Página</a>
          </Button>
        </div>
      </div>

      {/* Link card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Link de agendamento</p>
            <p className="text-xs text-muted-foreground font-mono">{bookingLink}</p>
          </div>
          <Button size="sm" onClick={copyLink}><Copy className="w-3 h-3 mr-1" />Copiar</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
          <TabsTrigger value="types">Tipos de Reunião</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
        </TabsList>

        {/* Bookings list */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Nenhum agendamento</TableCell></TableRow>
                ) : filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{b.client_name}</p>
                        <p className="text-xs text-muted-foreground">{b.client_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.appointment_types?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(b.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[b.status]}`}>
                        {statusLabels[b.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {b.status === 'confirmed' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-emerald-400 text-xs" onClick={() => updateBookingStatus(b.id, 'completed')}>Concluir</Button>
                            <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => updateBookingStatus(b.id, 'cancelled')}>Cancelar</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Appointment types */}
        <TabsContent value="types" className="space-y-4">
          <Button onClick={() => { setEditType(null); setTypeForm({ name: '', description: '', duration_minutes: 60, buffer_minutes: 15, color: '#f97316' }); setTypeFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo Tipo
          </Button>
          <div className="grid gap-3">
            {types.filter(t => t.is_active).map(t => (
              <Card key={t.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                  <div className="flex-1">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.description || 'Sem descrição'}</p>
                  </div>
                  <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t.duration_minutes} min</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditType(t); setTypeForm({ name: t.name, description: t.description || '', duration_minutes: t.duration_minutes, buffer_minutes: t.buffer_minutes, color: t.color }); setTypeFormOpen(true); }}>
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteType(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Availability */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Horários de Funcionamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {avail.map(a => (
                <div key={a.id} className="flex items-center gap-4">
                  <div className="w-24">
                    <Label className="text-sm">{DAY_LABELS[a.day_of_week]}</Label>
                  </div>
                  <Switch checked={a.is_available} onCheckedChange={v => updateAvail(a.id, { is_available: v })} />
                  {a.is_available && (
                    <div className="flex items-center gap-2">
                      <Input type="time" className="w-28" value={a.start_time} onChange={e => updateAvail(a.id, { start_time: e.target.value })} />
                      <span className="text-muted-foreground">até</span>
                      <Input type="time" className="w-28" value={a.end_time} onChange={e => updateAvail(a.id, { end_time: e.target.value })} />
                    </div>
                  )}
                  {!a.is_available && <span className="text-sm text-muted-foreground">Indisponível</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Type form dialog */}
      <Dialog open={typeFormOpen} onOpenChange={setTypeFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editType ? 'Editar' : 'Novo'} Tipo de Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={typeForm.description} onChange={e => setTypeForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={typeForm.duration_minutes} onChange={e => setTypeForm(p => ({ ...p, duration_minutes: +e.target.value }))} />
              </div>
              <div>
                <Label>Intervalo (min)</Label>
                <Input type="number" value={typeForm.buffer_minutes} onChange={e => setTypeForm(p => ({ ...p, buffer_minutes: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <Input type="color" value={typeForm.color} onChange={e => setTypeForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-20" />
            </div>
            <Button onClick={handleSaveType} disabled={!typeForm.name} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
