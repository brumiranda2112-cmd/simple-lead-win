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
import { CalendarDays, Clock, CheckCircle, ArrowLeft, ArrowRight, User, Phone, Mail, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoKhronos from '@/assets/logo-khronos.png';

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

  const getWhatsAppLink = () => {
    if (!selectedType || !selectedDate || !selectedTime) return '#';
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const dateStr = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const message = `✅ *Agendamento Confirmado!*\n\nOlá ${formData.name}, seu agendamento foi confirmado com sucesso!\n\n📋 *Serviço:* ${selectedType.name}\n📅 *Data:* ${dateStr}\n🕐 *Horário:* ${selectedTime}\n\nEm caso de imprevisto, entre em contato para reagendar.\n\n_KHRÓNOS AI_`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

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
    if (!error) {
      setConfirmed(true);
      // Send WhatsApp confirmation
      const dateStr = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      sendWhatsAppConfirmation(formData.phone, formData.name, selectedType.name, dateStr, selectedTime);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="pt-10 pb-10 space-y-5">
            <img src={logoKhronos} alt="KHRÓNOS AI" className="h-16 mx-auto" />
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Agendamento Confirmado!</h2>
            <p className="text-gray-400">
              {selectedType?.name} em {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                Confirmação enviada via WhatsApp
              </p>
              {formData.email && (
                <p className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Confirmação enviada para {formData.email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-start p-4 pt-8 md:pt-12">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header with Khronos branding */}
        <div className="text-center space-y-4">
          <img src={logoKhronos} alt="KHRÓNOS AI" className="h-20 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              KHRÓNOS <span className="text-primary">AGENDAMENTO</span>
            </h1>
            <p className="text-gray-400 mt-1">Escolha o melhor horário para você</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {['Serviço', 'Data & Hora', 'Dados'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                step >= i ? "bg-primary text-primary-foreground" : "bg-[#2a2a2a] text-gray-500"
              )}>{i + 1}</div>
              <span className={cn("text-sm hidden sm:inline", step >= i ? "text-white" : "text-gray-500")}>{label}</span>
              {i < 2 && <div className={cn("w-8 h-px", step > i ? "bg-primary" : "bg-[#2a2a2a]")} />}
            </div>
          ))}
        </div>

        {/* Step 0: Type selection */}
        {step === 0 && (
          <div className="grid gap-3">
            {types.length === 0 && (
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="py-8 text-center">
                  <CalendarDays className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhum serviço disponível no momento</p>
                </CardContent>
              </Card>
            )}
            {types.map(type => (
              <Card
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all bg-[#1a1a1a] border-[#2a2a2a] hover:border-primary/50",
                  selectedType?.id === type.id && "border-primary ring-1 ring-primary"
                )}
                onClick={() => { setSelectedType(type); setStep(1); }}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{type.name}</h3>
                    {type.description && <p className="text-sm text-gray-400">{type.description}</p>}
                  </div>
                  <Badge variant="outline" className="border-[#2a2a2a] text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />{type.duration_minutes} min
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <CalendarDays className="w-4 h-4 text-primary" /> Selecione a data
                  </h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                    disabled={isDateDisabled}
                    locale={ptBR}
                    className="rounded-md border border-[#2a2a2a] pointer-events-auto"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                    <Clock className="w-4 h-4 text-primary" /> Horários disponíveis
                  </h3>
                  {!selectedDate ? (
                    <p className="text-sm text-gray-400">Selecione uma data primeiro</p>
                  ) : timeSlots.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum horário disponível nesta data</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {timeSlots.map(time => (
                        <Button
                          key={time}
                          size="sm"
                          variant={selectedTime === time ? 'default' : 'outline'}
                          className={selectedTime !== time ? 'border-[#2a2a2a] text-gray-300 hover:text-white hover:border-primary/50' : ''}
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
                <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setStep(0)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />Voltar
                </Button>
                <Button disabled={!selectedDate || !selectedTime} onClick={() => setStep(2)}>
                  Continuar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Client info */}
        {step === 2 && (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#222] p-3 rounded-lg text-sm space-y-1 border border-[#2a2a2a]">
                <p className="text-white font-medium">{selectedType?.name}</p>
                <p className="text-gray-400">
                  {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                </p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    className="pl-9 bg-[#222] border-[#2a2a2a] text-white placeholder:text-gray-500"
                    placeholder="Seu nome *"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <Input
                    className="pl-9 bg-[#222] border-[#2a2a2a] text-white placeholder:text-gray-500"
                    placeholder="WhatsApp (obrigatório) *"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    className="pl-9 bg-[#222] border-[#2a2a2a] text-white placeholder:text-gray-500"
                    type="email"
                    placeholder="Email (obrigatório) *"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <Textarea
                  className="bg-[#222] border-[#2a2a2a] text-white placeholder:text-gray-500"
                  placeholder="Observações (opcional)"
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />Voltar
                </Button>
                <Button
                  disabled={!formData.name || !formData.phone || !formData.email || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Agendando...' : '✅ Confirmar Agendamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-600">
          Powered by KHRÓNOS AI
        </p>
      </div>
    </div>
  );
}
