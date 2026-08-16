-- Migration Sportivis : champs nutrition / objectif global sur profiles
-- Peut être rejouée sans erreur.

alter table public.profiles
  add column if not exists sex text
    check (sex is null or sex in ('male', 'female'));

alter table public.profiles
  add column if not exists height_cm integer
    check (height_cm is null or height_cm between 120 and 250);

alter table public.profiles
  add column if not exists goal text
    check (
      goal is null
      or goal in ('masse', 'perte', 'force', 'endurance', 'forme')
    );

alter table public.profiles
  add column if not exists sessions_per_week integer
    check (
      sessions_per_week is null
      or sessions_per_week between 1 and 7
    );
