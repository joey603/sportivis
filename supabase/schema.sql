-- Sportivis — schéma Supabase
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → Run

-- Programmes (exercices embarqués en JSONB = même forme que l'app)
create table if not exists public.programs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Séances terminées
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null,
  program_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  logs jsonb not null default '[]'::jsonb
);

-- Exercices personnels
create table if not exists public.custom_exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  muscle text not null,
  equipment text not null,
  tracking text not null,
  default_rest_sec integer not null default 60,
  tags jsonb,
  instructions jsonb,
  created_at timestamptz not null default now()
);

-- Profil requis à l'inscription
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  age integer not null check (age between 13 and 120),
  updated_at timestamptz not null default now()
);

-- Historique des pesées
create table if not exists public.weight_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg between 30 and 300),
  recorded_at timestamptz not null default now()
);

create index if not exists programs_user_id_idx on public.programs (user_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists custom_exercises_user_id_idx on public.custom_exercises (user_id);
create index if not exists weight_entries_user_id_idx on public.weight_entries (user_id);
create index if not exists weight_entries_recorded_at_idx on public.weight_entries (recorded_at);

alter table public.programs enable row level security;
alter table public.sessions enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;

-- Policies : chaque utilisateur ne voit / modifie que ses lignes
create policy "programs_select_own" on public.programs
  for select using (auth.uid() = user_id);
create policy "programs_insert_own" on public.programs
  for insert with check (auth.uid() = user_id);
create policy "programs_update_own" on public.programs
  for update using (auth.uid() = user_id);
create policy "programs_delete_own" on public.programs
  for delete using (auth.uid() = user_id);

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

create policy "custom_exercises_select_own" on public.custom_exercises
  for select using (auth.uid() = user_id);
create policy "custom_exercises_insert_own" on public.custom_exercises
  for insert with check (auth.uid() = user_id);
create policy "custom_exercises_update_own" on public.custom_exercises
  for update using (auth.uid() = user_id);
create policy "custom_exercises_delete_own" on public.custom_exercises
  for delete using (auth.uid() = user_id);

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

create policy "weight_entries_select_own" on public.weight_entries
  for select using (auth.uid() = user_id);
create policy "weight_entries_insert_own" on public.weight_entries
  for insert with check (auth.uid() = user_id);
create policy "weight_entries_update_own" on public.weight_entries
  for update using (auth.uid() = user_id);
create policy "weight_entries_delete_own" on public.weight_entries
  for delete using (auth.uid() = user_id);
