-- MAMÁ RESPIRA Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== PROFILES ====================
-- Extends auth.users with app-specific data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  picture TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'premium', 'coach')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== VALIDATION CARDS ====================
CREATE TABLE validation_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_es TEXT NOT NULL,
  message_en TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== DAILY CHECK-INS ====================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  mood INTEGER NOT NULL CHECK (mood IN (1, 2, 3)),
  sleep_start TEXT,
  sleep_end TEXT,
  baby_wakeups INTEGER,
  brain_dump TEXT,
  ai_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== CHAT MESSAGES ====================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== DIRECT MESSAGES (Coach <-> User) ====================
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== BITÁCORAS (Sleep Logs) ====================
CREATE TABLE bitacoras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  day_number INTEGER DEFAULT 1,
  date TEXT NOT NULL,
  previous_day_wake_time TEXT,
  -- Nap 1
  nap_1_laid_down TEXT,
  nap_1_fell_asleep TEXT,
  nap_1_how_fell_asleep TEXT,
  nap_1_woke_up TEXT,
  nap_1_duration_minutes INTEGER,
  -- Nap 2
  nap_2_laid_down TEXT,
  nap_2_fell_asleep TEXT,
  nap_2_how_fell_asleep TEXT,
  nap_2_woke_up TEXT,
  nap_2_duration_minutes INTEGER,
  -- Nap 3
  nap_3_laid_down TEXT,
  nap_3_fell_asleep TEXT,
  nap_3_how_fell_asleep TEXT,
  nap_3_woke_up TEXT,
  nap_3_duration_minutes INTEGER,
  -- Other fields
  how_baby_ate TEXT,
  relaxing_routine_start TEXT,
  baby_mood TEXT,
  last_feeding_time TEXT,
  laid_down_for_bed TEXT,
  fell_asleep_at TEXT,
  time_to_fall_asleep_minutes INTEGER,
  number_of_wakings INTEGER,
  morning_wake_time TEXT,
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX checkins_user_id_created_at_idx ON checkins(user_id, created_at DESC);
CREATE INDEX chat_messages_session_id_created_at_idx ON chat_messages(session_id, created_at);
CREATE INDEX chat_messages_user_id_created_at_idx ON chat_messages(user_id, created_at DESC);
CREATE INDEX direct_messages_sender_id_idx ON direct_messages(sender_id, created_at DESC);
CREATE INDEX direct_messages_receiver_id_idx ON direct_messages(receiver_id, created_at DESC);
CREATE INDEX direct_messages_receiver_read_idx ON direct_messages(receiver_id, read);
CREATE INDEX bitacoras_user_id_date_idx ON bitacoras(user_id, date);
CREATE INDEX bitacoras_user_id_created_at_idx ON bitacoras(user_id, created_at DESC);
CREATE INDEX validation_cards_category_idx ON validation_cards(category);

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacoras ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Validation cards policies (public read)
CREATE POLICY "Validation cards are viewable by everyone"
  ON validation_cards FOR SELECT
  USING (true);

-- Checkins policies
CREATE POLICY "Users can view own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Direct messages policies
CREATE POLICY "Users can view messages they sent or received"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received (mark as read)"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Bitacoras policies
CREATE POLICY "Users can view own bitacoras"
  ON bitacoras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bitacoras"
  ON bitacoras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bitacoras"
  ON bitacoras FOR UPDATE
  USING (auth.uid() = user_id);

-- Coaches can view all bitacoras of their clients
CREATE POLICY "Coaches can view all bitacoras"
  ON bitacoras FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- ==================== FUNCTIONS ====================

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'picture'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bitacoras
CREATE TRIGGER update_bitacoras_updated_at
  BEFORE UPDATE ON bitacoras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== SEED DATA ====================

-- Insert validation cards
INSERT INTO validation_cards (message_es, category) VALUES
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
  ('La lactancia es difícil. Sea cual sea tu camino, está bien.', 'feeding');
