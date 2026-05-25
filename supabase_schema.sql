-- =============================================
-- Life Tracker Dashboard — Supabase SQL Schema
-- วิ่งคำสั่งนี้ใน Supabase SQL Editor ค่ะบอส
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. WORKOUT SESSIONS (เวทเทรนนิ่ง)
-- =============================================
create table workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default now()
);

create table workout_exercises (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references workout_sessions(id) on delete cascade not null,
  exercise_name text not null,
  muscle_group text,
  sets jsonb not null default '[]', -- [{weight_kg: 80, reps: 10}, ...]
  created_at timestamp with time zone default now()
);

-- =============================================
-- 2. CARDIO LOGS (คาร์ดิโอ)
-- =============================================
create table cardio_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  type text not null, -- วิ่ง / จักรยาน / ว่ายน้ำ / อื่นๆ
  duration_minutes int not null,
  distance_km decimal(5,2),
  calories int,
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 3. GOLF LOGS (ซ้อมกอล์ฟ)
-- =============================================
create table golf_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  location text,
  session_type text, -- driving_range / course / short_game / putting
  duration_minutes int,
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 4. STUDY LOGS (การเรียน)
-- =============================================
create table study_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  subject text not null,
  duration_minutes int not null,
  source text, -- หนังสือ / YouTube / Course / Podcast
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 5. STRETCHING LOGS (ยืดเหยียด)
-- =============================================
create table stretching_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  duration_minutes int not null,
  type text, -- Static / Dynamic / Yoga / PNF
  muscle_groups text[],
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 6. SLEEP LOGS (การนอน)
-- =============================================
create table sleep_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  sleep_time time,
  wake_time time,
  duration_hours decimal(4,2),
  quality int check (quality between 1 and 5),
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 7. BODY MEASUREMENTS (วัดร่างกาย)
-- =============================================
create table body_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_kg decimal(5,2),
  body_fat_percent decimal(4,1),
  waist_cm decimal(5,1),
  notes text,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 8. WEEKLY GOALS (เป้าหมายสัปดาห์)
-- =============================================
create table weekly_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  workout_days_target int default 4,
  cardio_sessions_target int default 3,
  golf_sessions_target int default 2,
  study_hours_target int default 5,
  stretch_days_target int default 5,
  sleep_hours_target decimal(3,1) default 7.5,
  created_at timestamp with time zone default now(),
  unique(user_id, week_start)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) — สำคัญมากค่ะ!
-- =============================================
alter table workout_sessions enable row level security;
alter table workout_exercises enable row level security;
alter table cardio_logs enable row level security;
alter table golf_logs enable row level security;
alter table study_logs enable row level security;
alter table stretching_logs enable row level security;
alter table sleep_logs enable row level security;
alter table body_measurements enable row level security;
alter table weekly_goals enable row level security;

-- Policies: ให้เห็นแค่ข้อมูลของตัวเอง
create policy "Users can manage their own data" on workout_sessions for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on workout_exercises for all using (
  session_id in (select id from workout_sessions where user_id = auth.uid())
);
create policy "Users can manage their own data" on cardio_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on golf_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on study_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on stretching_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on sleep_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on body_measurements for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on weekly_goals for all using (auth.uid() = user_id);

