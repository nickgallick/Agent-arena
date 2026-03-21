-- Agent Arena: Initial Schema
-- 15 tables, indexes, RLS policies, functions, and triggers

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  is_admin boolean not null default false,
  coins integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 2. agents
-- ============================================================
create table public.agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bio text,
  avatar_url text,
  model_name text,
  mps integer not null default 50,
  weight_class_id text,
  skill_count integer not null default 0,
  is_online boolean not null default false,
  is_npc boolean not null default false,
  soul_config jsonb,
  api_key_hash text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "Agents are viewable by everyone"
  on public.agents for select
  using (true);

create policy "Users can insert own agents"
  on public.agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agents"
  on public.agents for update
  using (auth.uid() = user_id);

create policy "Users can delete own agents"
  on public.agents for delete
  using (auth.uid() = user_id);

create index idx_agents_user_id on public.agents(user_id);
create index idx_agents_weight_class on public.agents(weight_class_id);
create index idx_agents_is_online on public.agents(is_online);
create index idx_agents_mps on public.agents(mps);

-- ============================================================
-- 3. agent_ratings
-- ============================================================
create table public.agent_ratings (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  weight_class_id text not null,
  rating real not null default 1500.0,
  rating_deviation real not null default 350.0,
  volatility real not null default 0.06,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  challenges_entered integer not null default 0,
  best_placement integer,
  current_streak integer not null default 0,
  last_rated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, weight_class_id)
);

alter table public.agent_ratings enable row level security;

create policy "Agent ratings are viewable by everyone"
  on public.agent_ratings for select
  using (true);

create index idx_agent_ratings_agent_id on public.agent_ratings(agent_id);
create index idx_agent_ratings_weight_class on public.agent_ratings(weight_class_id);
create index idx_agent_ratings_rating on public.agent_ratings(rating desc);

-- ============================================================
-- 4. challenges
-- ============================================================
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  prompt text,
  category text not null,
  format text not null default 'standard',
  weight_class_id text,
  time_limit_minutes integer not null default 60,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'judging', 'complete')),
  challenge_type text not null default 'daily',
  max_coins integer not null default 100,
  entry_count integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

create policy "Challenges are viewable by everyone"
  on public.challenges for select
  using (true);

create policy "Admins can manage challenges"
  on public.challenges for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create index idx_challenges_status on public.challenges(status);
create index idx_challenges_category on public.challenges(category);
create index idx_challenges_starts_at on public.challenges(starts_at);
create index idx_challenges_ends_at on public.challenges(ends_at);
create index idx_challenges_weight_class on public.challenges(weight_class_id);

-- ============================================================
-- 5. challenge_entries
-- ============================================================
create table public.challenge_entries (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'in_progress', 'submitted', 'judging', 'scored', 'disqualified')),
  submission_text text,
  submission_files jsonb,
  transcript jsonb,
  actual_mps integer,
  final_score real,
  placement integer,
  elo_change real,
  coins_awarded integer not null default 0,
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(challenge_id, agent_id)
);

alter table public.challenge_entries enable row level security;

create policy "Challenge entries are viewable by everyone"
  on public.challenge_entries for select
  using (true);

create policy "Users can insert own entries"
  on public.challenge_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.challenge_entries for update
  using (auth.uid() = user_id);

create index idx_entries_challenge_id on public.challenge_entries(challenge_id);
create index idx_entries_agent_id on public.challenge_entries(agent_id);
create index idx_entries_user_id on public.challenge_entries(user_id);
create index idx_entries_status on public.challenge_entries(status);
create index idx_entries_final_score on public.challenge_entries(final_score desc nulls last);
create index idx_entries_placement on public.challenge_entries(placement asc nulls last);

-- ============================================================
-- 6. judge_scores
-- ============================================================
create table public.judge_scores (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references public.challenge_entries(id) on delete cascade,
  judge_type text not null check (judge_type in ('alpha', 'beta', 'gamma', 'tiebreaker')),
  quality_score real not null default 0,
  creativity_score real not null default 0,
  completeness_score real not null default 0,
  practicality_score real not null default 0,
  overall_score real not null default 0,
  feedback text not null default '',
  red_flags text[] not null default '{}',
  raw_response jsonb,
  model_used text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  unique(entry_id, judge_type)
);

alter table public.judge_scores enable row level security;

create policy "Judge scores are viewable by everyone"
  on public.judge_scores for select
  using (true);

create index idx_judge_scores_entry_id on public.judge_scores(entry_id);

-- ============================================================
-- 7. wallets (coin transactions)
-- ============================================================
create table public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id uuid,
  reference_type text,
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "Users can view own wallet transactions"
  on public.wallets for select
  using (auth.uid() = user_id);

create index idx_wallets_user_id on public.wallets(user_id);

-- ============================================================
-- 8. badges
-- ============================================================
create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null default 'common' check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badges are viewable by everyone"
  on public.badges for select
  using (true);

-- ============================================================
-- 9. agent_badges
-- ============================================================
create table public.agent_badges (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique(agent_id, badge_id)
);

alter table public.agent_badges enable row level security;

create policy "Agent badges are viewable by everyone"
  on public.agent_badges for select
  using (true);

create index idx_agent_badges_agent_id on public.agent_badges(agent_id);

-- ============================================================
-- 10. model_registry
-- ============================================================
create table public.model_registry (
  id text primary key,
  provider text not null,
  mps integer not null,
  is_local boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.model_registry enable row level security;

create policy "Model registry is viewable by everyone"
  on public.model_registry for select
  using (true);

-- ============================================================
-- 11. weight_classes
-- ============================================================
create table public.weight_classes (
  id text primary key,
  name text not null,
  mps_min integer not null,
  mps_max integer not null,
  color text not null,
  icon text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.weight_classes enable row level security;

create policy "Weight classes are viewable by everyone"
  on public.weight_classes for select
  using (true);

-- ============================================================
-- 12. feature_flags
-- ============================================================
create table public.feature_flags (
  id text primary key,
  enabled boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

create policy "Feature flags are viewable by everyone"
  on public.feature_flags for select
  using (true);

-- ============================================================
-- 13. job_queue
-- ============================================================
create table public.job_queue (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  locked_by text,
  locked_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_queue enable row level security;

create policy "Admins can manage jobs"
  on public.job_queue for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create index idx_job_queue_status on public.job_queue(status);
create index idx_job_queue_type on public.job_queue(type);
create index idx_job_queue_pending on public.job_queue(created_at) where status = 'pending';

-- ============================================================
-- 14. notifications
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id, created_at desc) where read = false;

-- ============================================================
-- 15. audit_log
-- ============================================================
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Admins can view audit logs"
  on public.audit_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create index idx_audit_log_actor on public.audit_log(actor_id);
create index idx_audit_log_action on public.audit_log(action);
create index idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================
-- Functions
-- ============================================================

-- pick_job: Atomically pick and lock a pending job
create or replace function public.pick_job(job_type text, worker_id text)
returns public.job_queue
language plpgsql
as $$
declare
  picked public.job_queue;
begin
  update public.job_queue
  set
    status = 'processing',
    locked_by = worker_id,
    locked_at = now(),
    attempts = attempts + 1,
    updated_at = now()
  where id = (
    select id from public.job_queue
    where type = job_type
      and status = 'pending'
      and attempts < max_attempts
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning * into picked;
  return picked;
end;
$$;

-- complete_job: Mark a job as completed or failed
create or replace function public.complete_job(job_id uuid, success boolean, error_msg text default null)
returns void
language plpgsql
as $$
begin
  update public.job_queue
  set
    status = case
      when success then 'completed'
      when attempts >= max_attempts then 'dead'
      else 'failed'
    end,
    completed_at = case when success then now() else null end,
    error = error_msg,
    locked_by = null,
    locked_at = null,
    updated_at = now()
  where id = job_id;
end;
$$;

-- update_agent_elo: Update an agent's Glicko-2 rating
create or replace function public.update_agent_elo(
  p_agent_id uuid,
  p_weight_class_id text,
  p_new_rating real,
  p_new_rd real,
  p_new_volatility real,
  p_placement integer,
  p_is_win boolean
)
returns void
language plpgsql
as $$
begin
  insert into public.agent_ratings (agent_id, weight_class_id, rating, rating_deviation, volatility, wins, losses, challenges_entered, best_placement, current_streak)
  values (p_agent_id, p_weight_class_id, p_new_rating, p_new_rd, p_new_volatility,
    case when p_is_win then 1 else 0 end,
    case when not p_is_win then 1 else 0 end,
    1, p_placement,
    case when p_is_win then 1 else 0 end)
  on conflict (agent_id, weight_class_id)
  do update set
    rating = p_new_rating,
    rating_deviation = p_new_rd,
    volatility = p_new_volatility,
    wins = agent_ratings.wins + case when p_is_win then 1 else 0 end,
    losses = agent_ratings.losses + case when not p_is_win then 1 else 0 end,
    challenges_entered = agent_ratings.challenges_entered + 1,
    best_placement = least(agent_ratings.best_placement, p_placement),
    current_streak = case
      when p_is_win then agent_ratings.current_streak + 1
      else 0
    end,
    last_rated_at = now(),
    updated_at = now();
end;
$$;

-- credit_wallet: Add coins to a user's wallet
create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid default null,
  p_reference_type text default null
)
returns void
language plpgsql
as $$
begin
  insert into public.wallets (user_id, amount, reason, reference_id, reference_type)
  values (p_user_id, p_amount, p_reason, p_reference_id, p_reference_type);

  update public.profiles
  set coins = coins + p_amount, updated_at = now()
  where id = p_user_id;
end;
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.agents
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.agent_ratings
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.challenges
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.challenge_entries
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.feature_flags
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.job_queue
  for each row execute function public.update_updated_at();

-- Increment entry_count on challenge when new entry is added
create or replace function public.increment_entry_count()
returns trigger
language plpgsql
as $$
begin
  update public.challenges
  set entry_count = entry_count + 1
  where id = new.challenge_id;
  return new;
end;
$$;

create trigger on_entry_created
  after insert on public.challenge_entries
  for each row execute function public.increment_entry_count();
