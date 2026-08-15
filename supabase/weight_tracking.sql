-- Migration Sportivis : profil + suivi du poids
-- Peut être rejouée sans recréer les policies existantes.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  age integer not null check (age between 13 and 120),
  updated_at timestamptz not null default now()
);

create table if not exists public.weight_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg between 30 and 300),
  recorded_at timestamptz not null default now()
);

create index if not exists weight_entries_user_id_idx
  on public.weight_entries (user_id);
create index if not exists weight_entries_recorded_at_idx
  on public.weight_entries (recorded_at);

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'profiles_select_own'
  ) then
    create policy "profiles_select_own" on public.profiles
      for select using (auth.uid() = user_id);
    create policy "profiles_insert_own" on public.profiles
      for insert with check (auth.uid() = user_id);
    create policy "profiles_update_own" on public.profiles
      for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'weight_entries_select_own'
  ) then
    create policy "weight_entries_select_own" on public.weight_entries
      for select using (auth.uid() = user_id);
    create policy "weight_entries_insert_own" on public.weight_entries
      for insert with check (auth.uid() = user_id);
    create policy "weight_entries_update_own" on public.weight_entries
      for update using (auth.uid() = user_id);
    create policy "weight_entries_delete_own" on public.weight_entries
      for delete using (auth.uid() = user_id);
  end if;
end
$$;
