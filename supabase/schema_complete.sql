-- ============================================================================
-- MAMÁ RESPIRA — COMPLETE & SECURE SCHEMA (fresh install)
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor of the NEW project.
-- It supersedes migrations 001–008 (those are kept only as history).
--
-- Idempotent: safe to re-run. Single-coach model. Security-hardened from the
-- start (no privilege escalation, no PII enumeration, DM scoped to the coach,
-- working audit log, auth-bound rate limiting, no duplicate daily bitácoras).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'coach')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_es TEXT NOT NULL,
  message_en TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  mood INTEGER NOT NULL CHECK (mood IN (1, 2, 3)),
  sleep_start TEXT,
  sleep_end TEXT,
  sleep_hours INTEGER,                      -- sleep bucket from the daily check-in
  baby_wakeups INTEGER,
  brain_dump TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bitacoras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  day_number INTEGER DEFAULT 1,
  date DATE NOT NULL,                       -- real DATE (was free-form TEXT)
  previous_day_wake_time TEXT,
  nap_1_laid_down TEXT, nap_1_fell_asleep TEXT, nap_1_how_fell_asleep TEXT, nap_1_woke_up TEXT, nap_1_duration_minutes INTEGER,
  nap_2_laid_down TEXT, nap_2_fell_asleep TEXT, nap_2_how_fell_asleep TEXT, nap_2_woke_up TEXT, nap_2_duration_minutes INTEGER,
  nap_3_laid_down TEXT, nap_3_fell_asleep TEXT, nap_3_how_fell_asleep TEXT, nap_3_woke_up TEXT, nap_3_duration_minutes INTEGER,
  how_baby_ate TEXT,
  relaxing_routine_start TEXT,
  baby_mood TEXT,
  last_feeding_time TEXT,
  laid_down_for_bed TEXT,
  fell_asleep_at TEXT,
  time_to_fall_asleep_minutes INTEGER,
  number_of_wakings INTEGER,
  morning_wake_time TEXT,
  night_wakings JSONB,
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bitacoras_user_date_unique UNIQUE (user_id, date)  -- one entry per day
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL DEFAULT auth.uid(),  -- default = caller
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS checkins_user_id_created_at_idx ON checkins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_created_at_idx ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_created_at_idx ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_read_idx ON direct_messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS bitacoras_user_id_date_idx ON bitacoras(user_id, date DESC);
CREATE INDEX IF NOT EXISTS validation_cards_category_idx ON validation_cards(category);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER → bypass RLS, so policies on `profiles`
-- can reference `profiles` without infinite recursion)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_coach(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'coach');
$$;

CREATE OR REPLACE FUNCTION public.get_role(uid uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

REVOKE ALL ON FUNCTION public.is_coach(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_role(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_coach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role(uuid) TO authenticated;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Auto-create a profile row when an auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Mamá'),
    NEW.raw_user_meta_data->>'picture'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- A direct message is immutable except for its `read` flag
CREATE OR REPLACE FUNCTION public.dm_only_read_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sender_id   IS DISTINCT FROM OLD.sender_id
  OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
  OR NEW.content     IS DISTINCT FROM OLD.content
  OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the read flag may be updated on a direct message';
  END IF;
  RETURN NEW;
END;
$$;

-- Auth-bound rate limiter (ignores any client-supplied user id)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID, p_action TEXT, p_max_requests INTEGER, p_window_minutes INTEGER
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_count INTEGER; v_window_start TIMESTAMP;
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits WHERE user_id = v_uid AND action = p_action AND window_start > v_window_start;
  IF v_count >= p_max_requests THEN RETURN FALSE; END IF;
  INSERT INTO rate_limits (user_id, action, window_start) VALUES (v_uid, p_action, NOW());
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bitacoras_updated_at ON bitacoras;
CREATE TRIGGER update_bitacoras_updated_at
  BEFORE UPDATE ON bitacoras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS dm_immutable_except_read ON direct_messages;
CREATE TRIGGER dm_immutable_except_read
  BEFORE UPDATE ON direct_messages FOR EACH ROW EXECUTE FUNCTION public.dm_only_read_changes();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacoras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Coach profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Coach profiles are viewable by authenticated users" ON profiles FOR SELECT USING (role = 'coach');

DROP POLICY IF EXISTS "Coaches can view all profiles" ON profiles;
CREATE POLICY "Coaches can view all profiles" ON profiles FOR SELECT USING (public.is_coach(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- role is constrained too (defense-in-depth): a client INSERT can never seed a
-- privileged role. Normal signups go through handle_new_user (role defaults to
-- 'user'); coach promotion is done out-of-band via service_role / SQL.
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.get_role(auth.uid()));  -- cannot change own role

-- ---- validation_cards (public read) ----
DROP POLICY IF EXISTS "Validation cards are viewable by everyone" ON validation_cards;
CREATE POLICY "Validation cards are viewable by everyone" ON validation_cards FOR SELECT USING (true);

-- ---- checkins ----
DROP POLICY IF EXISTS "Users can view own checkins" ON checkins;
CREATE POLICY "Users can view own checkins" ON checkins FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own checkins" ON checkins;
CREATE POLICY "Users can create own checkins" ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own checkins" ON checkins;
CREATE POLICY "Users can update own checkins" ON checkins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- chat_messages ----
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own chat messages" ON chat_messages;
CREATE POLICY "Users can create own chat messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- direct_messages (user <-> coach only) ----
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON direct_messages;
CREATE POLICY "Users can view messages they sent or received" ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
CREATE POLICY "Users can send messages" ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (public.is_coach(auth.uid()) OR public.is_coach(receiver_id)));
DROP POLICY IF EXISTS "Users can update messages they received (mark as read)" ON direct_messages;
CREATE POLICY "Users can update messages they received (mark as read)" ON direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- ---- bitacoras ----
DROP POLICY IF EXISTS "Users can view own bitacoras" ON bitacoras;
CREATE POLICY "Users can view own bitacoras" ON bitacoras FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches can view all bitacoras" ON bitacoras;
CREATE POLICY "Coaches can view all bitacoras" ON bitacoras FOR SELECT USING (public.is_coach(auth.uid()));
DROP POLICY IF EXISTS "Users can create own bitacoras" ON bitacoras;
CREATE POLICY "Users can create own bitacoras" ON bitacoras FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own bitacoras" ON bitacoras;
CREATE POLICY "Users can update own bitacoras" ON bitacoras FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- rate_limits ----
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
CREATE POLICY "Users can view own rate limits" ON rate_limits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches can view all rate limits" ON rate_limits;
CREATE POLICY "Coaches can view all rate limits" ON rate_limits FOR SELECT USING (public.is_coach(auth.uid()));
-- (no INSERT policy: writes go through check_rate_limit(), which is SECURITY DEFINER)

-- ---- audit_logs (immutable) ----
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
CREATE POLICY "Users can insert own audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches can view all audit logs" ON audit_logs;
CREATE POLICY "Coaches can view all audit logs" ON audit_logs FOR SELECT USING (public.is_coach(auth.uid()));

-- ============================================================================
-- GRANTS (table privileges for the PostgREST API roles)
-- PostgREST connects as `anon` (no JWT) or `authenticated` (with JWT). Without
-- these GRANTs every request is "permission denied for table" (42501) BEFORE
-- RLS is ever evaluated. RLS still gates which ROWS each user sees.
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Logged-in users: DML on app tables — every row is still restricted by RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anonymous (not logged in): only the public validation cards.
GRANT SELECT ON public.validation_cards TO anon;

-- RPCs callable by logged-in users.
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated;

-- Tables created in the future also inherit these grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ============================================================================
-- STORAGE (buckets + policies)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own attachments" ON storage.objects;
CREATE POLICY "Users can view own attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Coaches can view client attachments" ON storage.objects;
CREATE POLICY "Coaches can view client attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments' AND public.is_coach(auth.uid()));

-- ============================================================================
-- SEED: validation cards (only when table is empty → idempotent)
-- ============================================================================
INSERT INTO validation_cards (message_es, category)
SELECT * FROM (VALUES
  ('No lo estás haciendo mal. 9 de cada 10 mamás se sienten exactamente así ahora mismo.', 'general'),
  ('Tu bebé te eligió como su mamá por una razón. Eres suficiente.', 'general'),
  ('Las noches difíciles no definen tu maternidad. Son solo noches.', 'sleep'),
  ('Está bien sentirse abrumada. Esto pasará.', 'general'),
  ('Tu bebé no necesita una mamá perfecta. Solo te necesita a ti.', 'general'),
  ('El llanto de tu bebé no es tu culpa. Los bebés lloran, es su forma de comunicarse.', 'crying'),
  ('Cada día que sobrevives es un día de éxito. Literalmente.', 'general'),
  ('No estás sola. Hay miles de mamás despiertas contigo ahora mismo.', 'general'),
  ('Pedir ayuda no es debilidad. Es inteligencia.', 'self_care'),
  ('Tu cuerpo acaba de crear vida. Mereces descanso y compasión.', 'self_care'),
  ('Algunas noches el único logro es sobrevivir. Y eso está perfecto.', 'sleep'),
  ('El amor que sientes por tu bebé, aunque estés agotada, es todo lo que necesita.', 'general'),
  ('Respira. Este momento pasará. Mañana será un nuevo día.', 'general'),
  ('No tienes que disfrutar cada momento para ser buena mamá.', 'general'),
  ('La lactancia es difícil. Sea cual sea tu camino, está bien.', 'feeding')
) AS seed(message_es, category)
WHERE NOT EXISTS (SELECT 1 FROM validation_cards);

-- ============================================================================
-- AFTER RUNNING: promote your coach account (sign up in the app first, then):
--   UPDATE profiles SET role = 'coach' WHERE email = 'TU_COACH@ejemplo.com';
-- (Run as the SQL editor / service role — RLS forbids users changing their own role.)
-- ============================================================================
