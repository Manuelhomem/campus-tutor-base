CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  primeiro_nome text NOT NULL,
  ultimo_nome text NOT NULL,
  ano text NOT NULL DEFAULT '',
  curso text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'aluno' CHECK (tipo IN ('aluno','tutor')),
  bio text,
  disciplinas text[] NOT NULL DEFAULT '{}',
  disponibilidade text[] NOT NULL DEFAULT '{}',
  disponibilidade_modo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile or tutors visible" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR tipo = 'tutor');
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tutor_name text NOT NULL,
  subject text NOT NULL,
  day text NOT NULL,
  time text NOT NULL,
  mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR tutor_id = auth.uid());
CREATE POLICY "Create own bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Cancel own bookings" ON public.bookings FOR DELETE TO authenticated
  USING (student_id = auth.uid());