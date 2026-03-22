import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addMinutes, isBefore, isAfter, startOfDay, setHours, setMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, CheckCircle, ArrowLeft, ArrowRight, User, Phone, Mail, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  color: string;
}

interface AvailabilitySetting {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Booking {
  start_time: string;
  end_time: string;
}

export default function Agendar() {
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySetting[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [t, a, b] = await Promise.all([
        supabase.from('appointment_types').select('*').eq('is_active', true),
        supabase.from('availability_settings').select('*'),
        supabase.from('blocked_dates').select('date'),
      ]);
      if (t.data) setTypes(t.data);
      if (a.data) setAvailability(a.data);
      if (b.data) setBlockedDates(b.data.map(d => d.date));
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const start = startOfDay(selectedDate).toISOString();
    const end = startOfDay(addMinutes(selectedDate, 24 * 60)).toISOString();
    supabase.from('bookings').select('start_time, end_time')
      .neq('status', 'cancelled')
      .gte('start_time', start)
      .lt('start_time', end)
      .then(({ data }) => { if (data) setExistingBookings(data); });
  }, [selectedDate]);

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    const dow = date.getDay();
    const av = availability.find(a => a.day_of_week === dow);
    if (!av || !av.is_available) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (blockedDates.includes(dateStr)) return true;
    return false;
  };

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedType) return [];
    const dow = selectedDate.getDay();
    const av = availability.find(a => a.day_of_week === dow);
    if (!av || !av.is_available) return [];

    const [sh, sm] = av.start_time.split(':').map(Number);
    const [eh, em] = av.end_time.split(':').map(Number);
    const slots: string[] = [];
    let current = setMinutes(setHours(selectedDate, sh), sm);
    const end = setMinutes(setHours(selectedDate, eh), em);
    const now = new Date();

    while (isBefore(current, end)) {
      const slotEnd = addMinutes(current, selectedType.duration_minutes);
      if (isAfter(slotEnd, end)) break;
      if (isSameDay(current, now) && isBefore(current, now)) {
        current = addMinutes(current, 30);
        continue;
      }
      // Check conflicts with existing bookings
      const slotStart = current.toISOString();
      const slotEndStr = slotEnd.toISOString();
      const hasConflict = existingBookings.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = addMinutes(new Date(b.end_time), selectedType.buffer_minutes);
        return isBefore(current, bEnd) && isAfter(slotEnd, bStart);
      });
      if (!hasConflict) {
        slots.push(format(current, 'HH:mm'));
      }
      current = addMinutes(current, 30);
    }
    return slots;
  }, [selectedDate, selectedType, availability, existingBookings]);

  const handleSubmit = async () => {
    if (!selectedType || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    const [h, m] = selectedTime.split(':').map(Number);
    const start = setMinutes(setHours(selectedDate, h), m);
    const end = addMinutes(start, selectedType.duration_minutes);

    const { error } = await supabase.from('bookings').insert({
      appointment_type_id: selectedType.id,
      client_name: formData.name,
      client_email: formData.email || null,
      client_phone: formData.phone,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes: formData.notes || null,
    });

    setSubmitting(false);
    if (!error) setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground">
              {selectedType?.name} em {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
            </p>
            <p className="text-sm text-muted-foreground">Entraremos em contato pelo WhatsApp para confirmar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Agendar Reunião</h1>
          <p className="text-muted-foreground">Escolha o tipo, data e horário para sua reunião</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {['Serviço', 'Data & Hora', 'Dados'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                step >= i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>{i + 1}</div>
              <span className={cn("text-sm hidden sm:inline", step >= i ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <div className={cn("w-8 h-px", step > i ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Step 0: Type selection */}
        {step === 0 && (
          <div className="grid gap-3">
            {types.map(type => (
              <Card
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  selectedType?.id === type.id && "border-primary ring-1 ring-primary"
                )}
                onClick={() => { setSelectedType(type); setStep(1); }}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{type.name}</h3>
                    {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
                  </div>
                  <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{type.duration_minutes} min</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <CalendarDays className="w-4 h-4 text-primary" /> Selecione a data
                  </h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                    disabled={isDateDisabled}
                    locale={ptBR}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-primary" /> Horários disponíveis
                  </h3>
                  {!selectedDate ? (
                    <p className="text-sm text-muted-foreground">Selecione uma data primeiro</p>
                  ) : timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível nesta data</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {timeSlots.map(time => (
                        <Button
                          key={time}
                          size="sm"
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
                <Button disabled={!selectedDate || !selectedTime} onClick={() => setStep(2)}>
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Client info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 p-3 rounded-lg text-sm space-y-1">
                <p className="text-foreground font-medium">{selectedType?.name}</p>
                <p className="text-muted-foreground">
                  {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                </p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Seu nome *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="WhatsApp *" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Email (opcional)" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <Textarea placeholder="Observações (opcional)" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
                <Button
                  disabled={!formData.name || !formData.phone || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
