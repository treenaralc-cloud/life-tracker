-- =============================================
-- Life Tracker Dashboard — Supabase SQL Schema v3 (Phase 3)
-- =============================================

-- =============================================
-- 13. ONE-OFF TASKS (งาน/อีเวนต์แบบครั้งเดียว)
-- =============================================
create table if not exists one_off_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  task_date date not null,
  task_time time, -- optional
  status text default 'pending', -- pending/done/skipped
  quick_note text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- 14. GAMIFICATION STATS (สถิติ XP/Level)
-- =============================================
create table if not exists gamification_stats (
  user_id uuid references auth.users(id) on delete cascade primary key,
  xp_points int default 0,
  current_level int default 1,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  updated_at timestamptz default now()
);

-- =============================================
-- 15. USER BADGES (เหรียญรางวัล)
-- =============================================
create table if not exists user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id text not null, -- e.g., 'iron_man_30', 'early_bird_7'
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- =============================================
-- 16. PROGRESS PHOTOS (คลังภาพ)
-- =============================================
create table if not exists progress_photos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  photo_url text not null,
  photo_date date not null,
  photo_type text default 'body', -- 'body' or 'golf_swing'
  weight_at_time numeric,
  waist_at_time numeric,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- 17. SMART GOALS SUBTASKS (เป้าหมายย่อย)
-- =============================================
create table if not exists goal_subtasks (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references weekly_goals(id) on delete cascade not null,
  title text not null,
  target_date date,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table one_off_tasks enable row level security;
alter table gamification_stats enable row level security;
alter table user_badges enable row level security;
alter table progress_photos enable row level security;
alter table goal_subtasks enable row level security;

-- Policies
create policy "Users can manage their own data" on one_off_tasks for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on gamification_stats for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on user_badges for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on progress_photos for all using (auth.uid() = user_id);
create policy "Users can manage their own data" on goal_subtasks for all using (
  goal_id in (select id from weekly_goals where user_id = auth.uid())
);
