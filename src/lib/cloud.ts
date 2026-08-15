import type {
  AppData,
  Exercise,
  Program,
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
};

type WeightEntryRow = {
  id: string;
  weight_kg: number;
  recorded_at: string;
};

function requireClient() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export async function fetchCloudData(): Promise<AppData> {
  const client = requireClient();
  const [programsRes, sessionsRes, customRes, profileRes, weightsRes] =
    await Promise.all([
    client.from('programs').select('*').order('updated_at', { ascending: false }),
    client.from('sessions').select('*').order('started_at', { ascending: false }),
    client.from('custom_exercises').select('*').order('created_at', { ascending: false }),
    client.from('profiles').select('first_name,last_name,age').maybeSingle(),
    client.from('weight_entries').select('*').order('recorded_at', { ascending: true }),
  ]);

  if (programsRes.error) throw programsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (customRes.error) throw customRes.error;
  if (profileRes.error) throw profileRes.error;
  if (weightsRes.error) throw weightsRes.error;

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

  const profileRow = profileRes.data as ProfileRow | null;
  const profile: UserProfile | undefined = profileRow
    ? {
        firstName: profileRow.first_name,
        lastName: profileRow.last_name,
        age: profileRow.age,
      }
    : undefined;
  const weightEntries = (weightsRes.data as WeightEntryRow[]).map((row) => ({
    id: row.id,
    weightKg: Number(row.weight_kg),
    recordedAt: row.recorded_at,
  }));

  return { programs, sessions, customExercises, profile, weightEntries };
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
}

export async function upsertProfileCloud(
  profile: UserProfile,
  userId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('profiles').upsert({
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    age: profile.age,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
