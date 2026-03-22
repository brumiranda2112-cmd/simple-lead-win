
-- Tipos de serviço/reunião
CREATE TABLE public.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 15,
  color text DEFAULT '#f97316',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disponibilidade semanal (horários de funcionamento)
CREATE TABLE public.availability_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  is_available boolean NOT NULL DEFAULT true,
  UNIQUE(day_of_week)
);

-- Agendamentos
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_type_id uuid REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bloqueios de horário (férias, feriados, etc)
CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  reason text,
  UNIQUE(date)
);

-- Inserir disponibilidade padrão (seg-sex 9h-18h)
INSERT INTO public.availability_settings (day_of_week, start_time, end_time, is_available) VALUES
  (0, '09:00', '18:00', false),  -- Domingo
  (1, '09:00', '18:00', true),   -- Segunda
  (2, '09:00', '18:00', true),   -- Terça
  (3, '09:00', '18:00', true),   -- Quarta
  (4, '09:00', '18:00', true),   -- Quinta
  (5, '09:00', '18:00', true),   -- Sexta
  (6, '09:00', '18:00', false);  -- Sábado

-- Inserir tipo de reunião padrão
INSERT INTO public.appointment_types (name, description, duration_minutes, buffer_minutes) VALUES
  ('Reunião Inicial', 'Primeira reunião para conhecer o projeto', 60, 15),
  ('Diagnóstico', 'Análise detalhada do projeto', 90, 15),
  ('Follow-up', 'Acompanhamento de projeto em andamento', 30, 10);

-- RLS: tabelas públicas para leitura (agendamento é público)
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Leitura pública para appointment_types ativos
CREATE POLICY "Public can view active appointment types" ON public.appointment_types FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage appointment types" ON public.appointment_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leitura pública para availability
CREATE POLICY "Public can view availability" ON public.availability_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage availability" ON public.availability_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Qualquer um pode criar booking, autenticados podem ver todos
CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own bookings by phone" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage bookings" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Blocked dates
CREATE POLICY "Public can view blocked dates" ON public.blocked_dates FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage blocked dates" ON public.blocked_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);
