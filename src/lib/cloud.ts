import type {
  AppData,
  Exercise,
  Meal,
  Program,
  ProgramShare,
  SentProgramShare,
  Session,
  UserProfile,
  WeightEntry,
} from '../types';
import { supabase } from './supabase';

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  exercises: Program['exercises'];
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  program_id: string;
  program_name: string;
  started_at: string;
  ended_at: string | null;
  logs: Session['logs'];
};

type CustomExerciseRow = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  tracking: string;
  default_rest_sec: number;
  tags: string[] | null;
  instructions: string[] | null;
};

type ProfileRow = {
  first_name: string;
  last_name: string;
  age: number;
  sex: string | null;
  height_cm: number | null;
  goal: string | null;
  sessions_per_week: number | null;
};

type WeightEntryRow = {
  id: string;
  weight_kg: number;
  recorded_at: string;
};

type MealRow = {
  id: string;
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  items: Meal['items'] | null;
  eaten_at: string;
};

function mapMeals(rows: MealRow[]): Meal[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    kcal: Number(row.kcal),
    proteinG: Number(row.protein_g ?? 0),
    carbsG: Number(row.carbs_g ?? 0),
    fatG: Number(row.fat_g ?? 0),
    items: row.items ?? [],
    eatenAt: row.eaten_at,
  }));
}

type ProgramShareRow = {
  id: string;
  source_program_id: string;
  sender_name: string;
  program_name: string;
  program_description: string | null;
  exercises: Program['exercises'];
  custom_exercises: Exercise[];
  created_at: string;
};

function mapProgramShares(rows: ProgramShareRow[]): ProgramShare[] {
  return rows.map((row) => ({
    id: row.id,
    senderName: row.sender_name,
    program: {
      id: row.source_program_id,
      name: row.program_name,
      description: row.program_description ?? undefined,
      exercises: row.exercises ?? [],
      createdAt: row.created_at,
      updatedAt: row.created_at,
    },
    customExercises: row.custom_exercises ?? [],
    createdAt: row.created_at,
  }));
}

function requireClient() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

/**
 * `localProfile` sert de repli quand les colonnes nutrition ne sont pas encore
 * migrées : sans lui, un pull effacerait sexe/taille/objectif du localStorage.
 */
export async function fetchCloudData(
  localProfile?: UserProfile,
): Promise<AppData> {
  const client = requireClient();
  const [
    programsRes,
    sessionsRes,
    customRes,
    profileRes,
    weightsRes,
    sharesRes,
    mealsRes,
  ] = await Promise.all([
    client.from('programs').select('*').order('updated_at', { ascending: false }),
    client.from('sessions').select('*').order('started_at', { ascending: false }),
    client.from('custom_exercises').select('*').order('created_at', { ascending: false }),
    client
      .from('profiles')
      .select('first_name,last_name,age,sex,height_cm,goal,sessions_per_week')
      .maybeSingle(),
    client.from('weight_entries').select('*').order('recorded_at', { ascending: true }),
    client
      .from('program_shares')
      .select(
        'id,source_program_id,sender_name,program_name,program_description,exercises,custom_exercises,created_at',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    client.from('meals').select('*').order('eaten_at', { ascending: false }),
  ]);

  if (programsRes.error) throw programsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (customRes.error) throw customRes.error;
  let profileData = profileRes.data;
  if (profileRes.error) {
    if (!isMissingColumn(profileRes.error)) throw profileRes.error;
    const fallback = await client
      .from('profiles')
      .select('first_name,last_name,age')
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    profileData = fallback.data
      ? {
          ...fallback.data,
          sex: localProfile?.sex ?? null,
          height_cm: localProfile?.heightCm ?? null,
          goal: localProfile?.goal ?? null,
          sessions_per_week: localProfile?.sessionsPerWeek ?? null,
        }
      : null;
  }
  if (weightsRes.error) throw weightsRes.error;
  // Permet de déployer le client avant d’exécuter la migration de partage.
  const sharingUnavailable = isMissingTable(sharesRes.error);
  if (sharesRes.error && !sharingUnavailable) throw sharesRes.error;
  const mealsUnavailable = isMissingTable(mealsRes.error);
  if (mealsRes.error && !mealsUnavailable) throw mealsRes.error;

  const programs = (programsRes.data as ProgramRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    exercises: row.exercises ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const sessions = (sessionsRes.data as SessionRow[]).map((row) => ({
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    logs: row.logs ?? [],
  }));

  const customExercises = (customRes.data as CustomExerciseRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    muscle: row.muscle as Exercise['muscle'],
    equipment: row.equipment as Exercise['equipment'],
    tracking: row.tracking as Exercise['tracking'],
    defaultRestSec: row.default_rest_sec,
    tags: row.tags ?? undefined,
    instructions: row.instructions ?? undefined,
    custom: true as const,
  }));

  const profileRow = profileData as ProfileRow | null;
  const profile: UserProfile | undefined = profileRow
    ? {
        firstName: profileRow.first_name,
        lastName: profileRow.last_name,
        age: profileRow.age,
        sex:
          profileRow.sex === 'male' || profileRow.sex === 'female'
            ? profileRow.sex
            : undefined,
        heightCm:
          profileRow.height_cm != null ? Number(profileRow.height_cm) : undefined,
        goal:
          profileRow.goal === 'masse' ||
          profileRow.goal === 'perte' ||
          profileRow.goal === 'force' ||
          profileRow.goal === 'endurance' ||
          profileRow.goal === 'forme'
            ? profileRow.goal
            : undefined,
        sessionsPerWeek:
          profileRow.sessions_per_week != null
            ? Number(profileRow.sessions_per_week)
            : undefined,
      }
    : undefined;
  const weightEntries = (weightsRes.data as WeightEntryRow[]).map((row) => ({
    id: row.id,
    weightKg: Number(row.weight_kg),
    recordedAt: row.recorded_at,
  }));
  const incomingProgramShares: ProgramShare[] = sharingUnavailable
    ? []
    : mapProgramShares((sharesRes.data ?? []) as ProgramShareRow[]);
  const meals: Meal[] = mealsUnavailable
    ? []
    : mapMeals((mealsRes.data ?? []) as MealRow[]);

  return {
    programs,
    sessions,
    customExercises,
    profile,
    weightEntries,
    incomingProgramShares,
    meals,
  };
}

/** La table n'existe pas encore : la migration correspondante n'est pas jouée. */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

/** Colonnes nutrition absentes tant que la migration n’est pas jouée. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    /column .* does not exist/i.test(error?.message ?? '')
  );
}

export async function pushAllData(data: AppData, userId: string): Promise<void> {
  const client = requireClient();

  if (data.programs.length) {
    const { error } = await client.from('programs').upsert(
      data.programs.map((p) => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        description: p.description ?? null,
        exercises: p.exercises,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
    );
    if (error) throw error;
  }

  if (data.sessions.length) {
    const { error } = await client.from('sessions').upsert(
      data.sessions.map((s) => ({
        id: s.id,
        user_id: userId,
        program_id: s.programId,
        program_name: s.programName,
        started_at: s.startedAt,
        ended_at: s.endedAt ?? null,
        logs: s.logs,
      })),
    );
    if (error) throw error;
  }

  if (data.customExercises.length) {
    const { error } = await client.from('custom_exercises').upsert(
      data.customExercises.map((e) => ({
        id: e.id,
        user_id: userId,
        name: e.name,
        muscle: e.muscle,
        equipment: e.equipment,
        tracking: e.tracking,
        default_rest_sec: e.defaultRestSec,
        tags: e.tags ?? null,
        instructions: e.instructions ?? null,
      })),
    );
    if (error) throw error;
  }

  if (data.profile) {
    await upsertProfileCloud(data.profile, userId);
  }

  if (data.weightEntries.length) {
    const { error } = await client.from('weight_entries').upsert(
      data.weightEntries.map((entry) => ({
        id: entry.id,
        user_id: userId,
        weight_kg: entry.weightKg,
        recorded_at: entry.recordedAt,
      })),
    );
    if (error) throw error;
  }

  if (data.meals.length) {
    const { error } = await client.from('meals').upsert(
      data.meals.map((meal) => ({
        id: meal.id,
        user_id: userId,
        label: meal.label,
        kcal: meal.kcal,
        protein_g: meal.proteinG,
        carbs_g: meal.carbsG,
        fat_g: meal.fatG,
        items: meal.items,
        eaten_at: meal.eatenAt,
      })),
    );
    if (error && !isMissingTable(error)) throw error;
  }
}

export async function upsertMealCloud(
  meal: Meal,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('meals').upsert({
    id: meal.id,
    user_id: userId,
    label: meal.label,
    kcal: meal.kcal,
    protein_g: meal.proteinG,
    carbs_g: meal.carbsG,
    fat_g: meal.fatG,
    items: meal.items,
    eaten_at: meal.eatenAt,
  });
  if (error) throw error;
}

export async function deleteMealCloud(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('meals').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertProfileCloud(
  profile: UserProfile,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const fullRow = {
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    age: profile.age,
    sex: profile.sex ?? null,
    height_cm: profile.heightCm ?? null,
    goal: profile.goal ?? null,
    sessions_per_week: profile.sessionsPerWeek ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from('profiles').upsert(fullRow);
  if (!error) return;
  if (!isMissingColumn(error)) throw error;
  const { error: fallbackError } = await client.from('profiles').upsert({
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    age: profile.age,
    updated_at: new Date().toISOString(),
  });
  if (fallbackError) throw fallbackError;
}

export async function upsertWeightEntryCloud(
  entry: WeightEntry,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('weight_entries').upsert({
    id: entry.id,
    user_id: userId,
    weight_kg: entry.weightKg,
    recorded_at: entry.recordedAt,
  });
  if (error) throw error;
}

export async function deleteWeightEntryCloud(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('weight_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertProgramCloud(
  program: Program,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('programs').upsert({
    id: program.id,
    user_id: userId,
    name: program.name,
    description: program.description ?? null,
    exercises: program.exercises,
    created_at: program.createdAt,
    updated_at: program.updatedAt,
  });
  if (error) throw error;
}

export async function deleteProgramCloud(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('programs').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertSessionCloud(
  session: Session,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('sessions').upsert({
    id: session.id,
    user_id: userId,
    program_id: session.programId,
    program_name: session.programName,
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    logs: session.logs,
  });
  if (error) throw error;
}

export async function deleteSessionCloud(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function shareProgramCloud(
  programId: string,
  recipientEmail: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('share_program_with_email', {
    p_program_id: programId,
    p_recipient_email: recipientEmail.trim().toLowerCase(),
  });
  if (error) throw error;
}

export async function fetchSentProgramSharesCloud(
  programId: string,
): Promise<SentProgramShare[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('list_sent_program_shares', {
    p_program_id: programId,
  });
  if (error) throw error;
  return ((data ?? []) as {
    id: string;
    recipient_name: string;
    recipient_email: string;
    status: SentProgramShare['status'];
    created_at: string;
    responded_at: string | null;
  }[]).map((row) => ({
    id: row.id,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
  }));
}

export async function respondToProgramShareCloud(
  shareId: string,
  accept: boolean,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('respond_to_program_share', {
    p_share_id: shareId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function fetchIncomingProgramSharesCloud(): Promise<ProgramShare[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('program_shares')
    .select(
      'id,source_program_id,sender_name,program_name,program_description,exercises,custom_exercises,created_at',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return mapProgramShares((data ?? []) as ProgramShareRow[]);
}

export async function upsertCustomExerciseCloud(
  exercise: Exercise,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('custom_exercises').upsert({
    id: exercise.id,
    user_id: userId,
    name: exercise.name,
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    tracking: exercise.tracking,
    default_rest_sec: exercise.defaultRestSec,
    tags: exercise.tags ?? null,
    instructions: exercise.instructions ?? null,
  });
  if (error) throw error;
}

/** Sync silencieux : n'interrompt jamais le flux local en cas d'erreur réseau. */
export function syncQuietly(task: () => Promise<void>): void {
  void task().catch((err) => {
    console.warn('[supabase]', err);
  });
}
