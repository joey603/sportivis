-- Sportivis — partage privé de programmes entre utilisateurs
-- À exécuter une fois dans : Supabase → SQL Editor → New query → Run

create table if not exists public.program_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  source_program_id uuid not null,
  sender_name text not null,
  program_name text not null,
  program_description text,
  exercises jsonb not null default '[]'::jsonb,
  custom_exercises jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists program_shares_recipient_pending_idx
  on public.program_shares (recipient_id, created_at desc)
  where status = 'pending';

create unique index if not exists program_shares_one_pending_idx
  on public.program_shares (sender_id, recipient_id, source_program_id)
  where status = 'pending';

alter table public.program_shares enable row level security;

drop policy if exists "program_shares_select_received" on public.program_shares;
create policy "program_shares_select_received" on public.program_shares
  for select using (auth.uid() = recipient_id);

-- Le client peut uniquement lire ses invitations. Création et réponse passent
-- par les fonctions contrôlées ci-dessous afin qu’aucun snapshot ni statut ne
-- puisse être falsifié avec l’API REST.
revoke all on table public.program_shares from anon;
revoke insert, update, delete on table public.program_shares from authenticated;
grant select on table public.program_shares to authenticated;

create or replace function public.share_program_with_email(
  p_program_id uuid,
  p_recipient_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_sender_id uuid := auth.uid();
  v_recipient_id uuid;
  v_program public.programs%rowtype;
  v_sender_name text;
  v_custom_exercises jsonb;
  v_existing_id uuid;
  v_share_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Tu dois être connecté pour partager un programme.';
  end if;

  if nullif(trim(p_recipient_email), '') is null then
    raise exception 'Renseigne l’email du destinataire.';
  end if;

  select id
    into v_recipient_id
    from auth.users
   where lower(email) = lower(trim(p_recipient_email))
   limit 1;

  if v_recipient_id is null then
    raise exception 'Aucun compte Sportivis ne correspond à cet email.';
  end if;

  if v_recipient_id = v_sender_id then
    raise exception 'Tu ne peux pas partager un programme avec toi-même.';
  end if;

  select *
    into v_program
    from public.programs
   where id = p_program_id
     and user_id = v_sender_id;

  if not found then
    raise exception 'Programme introuvable ou non enregistré.';
  end if;

  select id
    into v_existing_id
    from public.program_shares
   where sender_id = v_sender_id
     and recipient_id = v_recipient_id
     and source_program_id = p_program_id
     and status = 'pending';

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select coalesce(
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    'Un utilisateur Sportivis'
  )
    into v_sender_name
    from public.profiles
   where user_id = v_sender_id;

  v_sender_name := coalesce(v_sender_name, 'Un utilisateur Sportivis');

  -- Les exercices personnels utilisés sont embarqués dans l’invitation. Ils
  -- seront copiés avec de nouveaux identifiants seulement après acceptation.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', exercise.id,
        'name', exercise.name,
        'muscle', exercise.muscle,
        'equipment', exercise.equipment,
        'tracking', exercise.tracking,
        'defaultRestSec', exercise.default_rest_sec,
        'tags', exercise.tags,
        'instructions', exercise.instructions,
        'custom', true
      )
      order by exercise.created_at
    ),
    '[]'::jsonb
  )
    into v_custom_exercises
    from public.custom_exercises as exercise
   where exercise.user_id = v_sender_id
     and exists (
       select 1
         from jsonb_array_elements(v_program.exercises) as item
        where item->>'exerciseId' = exercise.id
     );

  insert into public.program_shares (
    sender_id,
    recipient_id,
    source_program_id,
    sender_name,
    program_name,
    program_description,
    exercises,
    custom_exercises
  )
  values (
    v_sender_id,
    v_recipient_id,
    v_program.id,
    v_sender_name,
    v_program.name,
    v_program.description,
    v_program.exercises,
    v_custom_exercises
  )
  returning id into v_share_id;

  return v_share_id;
end;
$$;

create or replace function public.respond_to_program_share(
  p_share_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_recipient_id uuid := auth.uid();
  v_share public.program_shares%rowtype;
  v_exercises jsonb;
  v_custom jsonb;
  v_old_custom_id text;
  v_new_custom_id text;
  v_program_id uuid;
begin
  if v_recipient_id is null then
    raise exception 'Tu dois être connecté pour répondre à ce partage.';
  end if;

  select *
    into v_share
    from public.program_shares
   where id = p_share_id
     and recipient_id = v_recipient_id
     and status = 'pending'
   for update;

  if not found then
    raise exception 'Cette invitation est introuvable ou a déjà été traitée.';
  end if;

  if not p_accept then
    update public.program_shares
       set status = 'rejected',
           responded_at = now()
     where id = p_share_id;
    return null;
  end if;

  v_exercises := v_share.exercises;

  -- Les IDs des exercices personnels sont uniques globalement. On crée donc
  -- une copie pour le destinataire puis on remplace leur référence dans le
  -- programme reçu.
  for v_custom in
    select value from jsonb_array_elements(v_share.custom_exercises)
  loop
    v_old_custom_id := v_custom->>'id';
    v_new_custom_id := 'custom-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.custom_exercises (
      id,
      user_id,
      name,
      muscle,
      equipment,
      tracking,
      default_rest_sec,
      tags,
      instructions
    )
    values (
      v_new_custom_id,
      v_recipient_id,
      v_custom->>'name',
      v_custom->>'muscle',
      v_custom->>'equipment',
      v_custom->>'tracking',
      coalesce((v_custom->>'defaultRestSec')::integer, 60),
      v_custom->'tags',
      v_custom->'instructions'
    );

    select coalesce(
      jsonb_agg(
        case
          when item.value->>'exerciseId' = v_old_custom_id
            then jsonb_set(
              item.value,
              '{exerciseId}',
              to_jsonb(v_new_custom_id),
              false
            )
          else item.value
        end
        order by item.ordinality
      ),
      '[]'::jsonb
    )
      into v_exercises
      from jsonb_array_elements(v_exercises) with ordinality as item(value, ordinality);
  end loop;

  v_program_id := gen_random_uuid();
  insert into public.programs (
    id,
    user_id,
    name,
    description,
    exercises,
    created_at,
    updated_at
  )
  values (
    v_program_id,
    v_recipient_id,
    v_share.program_name,
    v_share.program_description,
    v_exercises,
    now(),
    now()
  );

  update public.program_shares
     set status = 'accepted',
         responded_at = now()
   where id = p_share_id;

  return v_program_id;
end;
$$;

revoke all on function public.share_program_with_email(uuid, text) from public;
revoke all on function public.respond_to_program_share(uuid, boolean) from public;
grant execute on function public.share_program_with_email(uuid, text) to authenticated;
grant execute on function public.respond_to_program_share(uuid, boolean) to authenticated;
