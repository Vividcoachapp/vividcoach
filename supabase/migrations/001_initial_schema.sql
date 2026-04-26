-- VividCoach Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- RLS is enabled on every table before any data is written.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
CREATE TABLE profiles (
  id              uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email           text,
  full_name       text,
  subscription_tier text NOT NULL DEFAULT 'free'
                    CHECK (subscription_tier IN ('free', 'premium')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: owner select"  ON profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "profiles: owner insert"  ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: owner update"  ON profiles FOR UPDATE  USING (auth.uid() = id);

-- ─────────────────────────────────────────
-- coach_selections
-- ─────────────────────────────────────────
CREATE TABLE coach_selections (
  id                uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id          integer NOT NULL CHECK (coach_id BETWEEN 1 AND 28),
  coach_custom_name text,
  vibe              text CHECK (vibe IN ('warm', 'direct', 'intense')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_selections: owner all"
  ON coach_selections USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- coach_memory
-- ─────────────────────────────────────────
CREATE TABLE coach_memory (
  id           uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id     integer NOT NULL,
  memory_type  text NOT NULL
                 CHECK (memory_type IN ('goal','constraint','preference','pattern','milestone','moment')),
  content      text NOT NULL,
  confidence   float NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz
);

ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_memory: owner all"
  ON coach_memory USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────
CREATE TABLE messages (
  id         uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id   integer NOT NULL,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages: owner all"
  ON messages USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- workout_logs
-- ─────────────────────────────────────────
CREATE TABLE workout_logs (
  id                uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id          integer NOT NULL,
  date              date NOT NULL,
  exercises         jsonb NOT NULL DEFAULT '[]',
  duration_minutes  integer,
  perceived_effort  integer CHECK (perceived_effort BETWEEN 1 AND 10),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_logs: owner all"
  ON workout_logs USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- nutrition_logs
-- ─────────────────────────────────────────
CREATE TABLE nutrition_logs (
  id               uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             date NOT NULL,
  meal_description text NOT NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_logs: owner all"
  ON nutrition_logs USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- weight_logs
-- ─────────────────────────────────────────
CREATE TABLE weight_logs (
  id          uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        date NOT NULL,
  value       float NOT NULL,
  metric_type text NOT NULL DEFAULT 'weight',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight_logs: owner all"
  ON weight_logs USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- message_counts  (free tier 20/day limit)
-- ─────────────────────────────────────────
CREATE TABLE message_counts (
  id         uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       date NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE message_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_counts: owner all"
  ON message_counts USING (auth.uid() = user_id);
