-- Sportivis — génération de programmes par IA + journal alimentaire
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- Le script est rejouable sans effet de bord.

/* ------------------------------------------------------------------ */
/* Quota d'appels IA                                                  */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_day date not null,
  feature text not null check (feature in ('program', 'meal')),
  used integer not null default 0 check (used >= 0),
  primary key (user_id, usage_day, feature)
);

/**
 * Plafond journalier par utilisateur et par fonctionnalité. Défini en base
 * plutôt que transmis par l'appelant : un client ne peut donc pas se
 * l'accorder lui-même en appelant la RPC directement.
 */
create or replace function public.ai_quota_limit(p_feature text)
returns integer
language sql
immutable
as $$
  select case p_feature
           when 'program' then 10
           when 'meal' then 40
         end;
$$;

/** Consomme un appel et renvoie le nombre d'appels restants pour la journée. */
create or replace function public.consume_ai_quota(p_feature text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := public.ai_quota_limit(p_feature);
  v_used integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_limit is null then
    raise exception 'unknown_feature';
  end if;

  insert into public.ai_usage as u (user_id, usage_day, feature, used)
  values (v_user, (now() at time zone 'utc')::date, p_feature, 1)
  on conflict (user_id, usage_day, feature) do update
     set used = u.used + 1
   where u.used < v_limit
  returning u.used into v_used;

  if v_used is null then
    raise exception 'quota_exceeded';
  end if;

  return greatest(v_limit - v_used, 0);
end;
$$;

/** Lecture seule, pour afficher le solde du jour dans l'interface. */
create or replace function public.ai_quota_remaining(p_feature text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := public.ai_quota_limit(p_feature);
  v_used integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if v_limit is null then
    raise exception 'unknown_feature';
  end if;

  select used into v_used
    from public.ai_usage
   where user_id = v_user
     and usage_day = (now() at time zone 'utc')::date
     and feature = p_feature;

  return greatest(v_limit - coalesce(v_used, 0), 0);
end;
$$;

/* ------------------------------------------------------------------ */
/* Journal alimentaire                                                */
/* ------------------------------------------------------------------ */

create table if not exists public.meals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  kcal integer not null check (kcal between 0 and 20000),
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  items jsonb not null default '[]'::jsonb,
  eaten_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_idx
  on public.meals (user_id, eaten_at desc);

/* ------------------------------------------------------------------ */
/* Sécurité                                                           */
/* ------------------------------------------------------------------ */

alter table public.ai_usage enable row level security;
alter table public.meals enable row level security;

do $$
begin
  -- Le compteur n'est écrit que par les fonctions security definer.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'ai_usage_select_own'
  ) then
    create policy "ai_usage_select_own" on public.ai_usage
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname = 'meals_select_own'
  ) then
    create policy "meals_select_own" on public.meals
      for select using (auth.uid() = user_id);
    create policy "meals_insert_own" on public.meals
      for insert with check (auth.uid() = user_id);
    create policy "meals_update_own" on public.meals
      for update using (auth.uid() = user_id);
    create policy "meals_delete_own" on public.meals
      for delete using (auth.uid() = user_id);
  end if;
end
$$;

revoke all on function public.consume_ai_quota(text) from public;
revoke all on function public.consume_ai_quota(text) from anon;
revoke all on function public.ai_quota_remaining(text) from public;
revoke all on function public.ai_quota_remaining(text) from anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
grant execute on function public.ai_quota_remaining(text) to authenticated;
grant select on public.ai_usage to authenticated;
grant select, insert, update, delete on public.meals to authenticated;
