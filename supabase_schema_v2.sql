-- =============================================
-- Life Tracker Dashboard — Supabase SQL Schema v2
-- =============================================

-- =============================================
-- 9. ROUTINES (กิจวัตรประจำ)
-- =============================================
create table if not exists routines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null,          -- workout/cardio/golf/study/stretch
  days_of_week int[] not null,     -- [1,3,5] = จ,พ,ศ (0=Sun, 1=Mon, ..., 6=Sat) - matching JS Date.getDay() or isoWeek. Let's stick to 0-6 where 0=Sunday for JS compat, or 1-7 for ISO. Let's use 0-6 matching JS getDay().
  date_start date,                 -- เริ่มต้น (optional)
  date_end date,                   -- สิ้นสุด (optional)
  color text default 'blue',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- 10. ROUTINE ITEMS (รายละเอียดใน routine)
-- =============================================
create table if not exists routine_items (
  id uuid default uuid_generate_v4() primary key,
  routine_id uuid references routines(id) on delete cascade not null,
  item_name text not null,         -- ชื่อท่า/กิจกรรม
  muscle_group text,
  default_sets jsonb default '[]', -- [{weight_kg: 80, reps: 10}]
  sort_order int default 0,
  created_at timestamptz default now()
);

-- =============================================
-- 11. SCHEDULE LOGS (สถานะรายวัน)
-- =============================================
create table if not exists schedule_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid references routines(id) on delete cascade,
  scheduled_date date not null,
  status text default 'pending',   -- pending/done/skipped
  linked_session_id uuid,          -- link ไปที่ workout_sessions หรืออื่นๆ
  quick_note text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- 12. EXERCISE LIBRARY (คลังท่า auto-fill)
-- =============================================
create table if not exists exercise_library (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_name text not null,
  muscle_group text,
  last_sets jsonb default '[]',    -- น้ำหนัก/เซ็ทล่าสุด
  last_used date,
  use_count int default 1,
  unique(user_id, exercise_name)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table routines enable row level security;
alter table routine_items enable row level security;
alter table schedule_logs enable row level security;
alter table exercise_library enable row level security;

-- Policies
create policy "Users can manage their own data" on routines for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on routine_items for all using (
  routine_id in (select id from routines where user_id = auth.uid())
);
create policy "Users can manage their own data" on schedule_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on exercise_library for all using (auth.uid() = user_id);
