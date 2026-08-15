import type {
  AppData,
  Exercise,
  Program,
  ProgramExercise,
  Session,
  UserProfile,
  WeightEntry,
} from '../types';
import { EXERCISES, getExerciseById as getBuiltInExercise } from '../data/exercises';
import {
  deleteProgramCloud,
  deleteSessionCloud,
  deleteWeightEntryCloud,
  syncQuietly,
  upsertCustomExerciseCloud,
  upsertProfileCloud,
  upsertProgramCloud,
  upsertSessionCloud,
  upsertWeightEntryCloud,
} from './cloud';
import { cloudUserId } from './cloudUser';
import { isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'sportivis-data-v1';

function uid(): string {
  return crypto.randomUUID();
}

function notifyDataChanged() {
  window.dispatchEvent(new Event('sportivis-data'));
}

function sampleProgram(): Program {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: 'Full body machines',
    description: 'Programme d\'exemple : machines guidées + cardio léger',
    createdAt: now,
    updatedAt: now,
    exercises: [
      {
        id: uid(),
        exerciseId: 'leg-press',
        sets: 3,
        reps: 12,
        restSec: 120,
        targetWeightKg: 80,
      },
      {
        id: uid(),
        exerciseId: 'chest-press-machine',
        sets: 3,
        reps: 10,
        restSec: 90,
        targetWeightKg: 40,
      },
      {
        id: uid(),
        exerciseId: 'lat-pulldown',
        sets: 3,
        reps: 10,
        restSec: 90,
        targetWeightKg: 45,
      },
      {
        id: uid(),
        exerciseId: 'shoulder-press-machine',
        sets: 3,
        reps: 10,
        restSec: 75,
        targetWeightKg: 25,
      },
      {
        id: uid(),
        exerciseId: 'leg-curl-seated',
        sets: 3,
        reps: 12,
        restSec: 60,
      },
      {
        id: uid(),
        exerciseId: 'triceps-pushdown',
        sets: 2,
        reps: 12,
        restSec: 45,
      },
      {
        id: uid(),
        exerciseId: 'curl-machine',
        sets: 2,
        reps: 12,
        restSec: 45,
      },
      {
        id: uid(),
        exerciseId: 'plank',
        sets: 2,
        durationSec: 45,
        restSec: 30,
      },
      {
        id: uid(),
        exerciseId: 'elliptical',
        sets: 1,
        durationSec: 600,
        restSec: 0,
        notes: 'Retour au calme 10 min',
      },
    ],
  };
}

function defaultData(): AppData {
  return {
    programs: [sampleProgram()],
    sessions: [],
    customExercises: [],
    weightEntries: [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = defaultData();
      saveData(data);
      return data;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      programs: parsed.programs ?? [],
      sessions: parsed.sessions ?? [],
      customExercises: parsed.customExercises ?? [],
      profile: parsed.profile,
      weightEntries: parsed.weightEntries ?? [],
    };
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyDataChanged();
}

/**
 * Vide le cache local. Appelé à la déconnexion pour qu'un compte ne voie pas
 * les données du précédent sur le même appareil.
 */
export function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEY);
  notifyDataChanged();
}

export function saveProfile(profile: UserProfile): AppData {
  const data = loadData();
  data.profile = profile;
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertProfileCloud(profile, userId));
  }
  return data;
}

export function addWeightEntry(
  weightKg: number,
  recordedAt = new Date().toISOString(),
): AppData {
  const data = loadData();
  const entry: WeightEntry = {
    id: uid(),
    weightKg: Math.round(weightKg * 10) / 10,
    recordedAt,
  };
  data.weightEntries = [...data.weightEntries, entry].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertWeightEntryCloud(entry, userId));
  }
  return data;
}

export function deleteWeightEntry(id: string): AppData {
  const data = loadData();
  data.weightEntries = data.weightEntries.filter((entry) => entry.id !== id);
  saveData(data);
  if (isSupabaseConfigured && cloudUserId()) {
    syncQuietly(() => deleteWeightEntryCloud(id));
  }
  return data;
}

export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json) as Partial<AppData>;
  if (!parsed.programs || !parsed.sessions) {
    throw new Error('Fichier invalide');
  }
  const data: AppData = {
    programs: parsed.programs,
    sessions: parsed.sessions,
    customExercises: parsed.customExercises ?? [],
    profile: parsed.profile,
    weightEntries: parsed.weightEntries ?? [],
  };
  saveData(data);
  return data;
}

export function createId(): string {
  return uid();
}

export function getAllExercises(): Exercise[] {
  return [...loadData().customExercises, ...EXERCISES];
}

export function getExerciseById(id: string): Exercise | undefined {
  return (
    loadData().customExercises.find((exercise) => exercise.id === id) ??
    getBuiltInExercise(id)
  );
}

/** « library » regroupe la bibliothèque de base et la sélection supplémentaire. */
export type ExerciseCategory = 'library' | 'custom';

export function searchAllExercises(
  query: string,
  muscle?: string,
  equipment?: string,
  category?: ExerciseCategory,
): Exercise[] {
  const q = query.trim().toLocaleLowerCase('fr');
  return getAllExercises().filter((exercise) => {
    if (category === 'custom' && !exercise.custom) return false;
    if (category === 'library' && exercise.custom) return false;
    if (muscle && exercise.muscle !== muscle) return false;
    if (equipment && exercise.equipment !== equipment) return false;
    if (!q) return true;
    return (
      exercise.name.toLocaleLowerCase('fr').includes(q) ||
      exercise.muscle.includes(q) ||
      exercise.equipment.includes(q) ||
      (exercise.tags?.some((tag) => tag.toLocaleLowerCase('fr').includes(q)) ??
        false)
    );
  });
}

export function saveCustomExercise(exercise: Exercise): AppData {
  const data = loadData();
  const customExercise = { ...exercise, custom: true };
  const index = data.customExercises.findIndex((item) => item.id === exercise.id);
  if (index >= 0) {
    data.customExercises[index] = customExercise;
  } else {
    data.customExercises.unshift(customExercise);
  }
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertCustomExerciseCloud(customExercise, userId));
  }
  return data;
}

export function upsertProgram(program: Program): AppData {
  const data = loadData();
  const next = { ...program, updatedAt: new Date().toISOString() };
  const idx = data.programs.findIndex((p) => p.id === program.id);
  if (idx >= 0) {
    data.programs[idx] = next;
  } else {
    data.programs.unshift(next);
  }
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertProgramCloud(next, userId));
  }
  return data;
}

export function deleteProgram(id: string): AppData {
  const data = loadData();
  data.programs = data.programs.filter((p) => p.id !== id);
  saveData(data);
  if (isSupabaseConfigured && cloudUserId()) {
    syncQuietly(() => deleteProgramCloud(id));
  }
  return data;
}

export function duplicateProgram(id: string): AppData {
  const data = loadData();
  const original = data.programs.find((p) => p.id === id);
  if (!original) return data;
  const now = new Date().toISOString();
  const copy: Program = {
    ...structuredClone(original),
    id: uid(),
    name: `${original.name} (copie)`,
    createdAt: now,
    updatedAt: now,
    exercises: original.exercises.map((e) => ({ ...e, id: uid() })),
  };
  data.programs.unshift(copy);
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertProgramCloud(copy, userId));
  }
  return data;
}

export function saveSession(session: Session): AppData {
  const data = loadData();
  const idx = data.sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    data.sessions[idx] = session;
  } else {
    data.sessions.unshift(session);
  }
  saveData(data);
  const userId = cloudUserId();
  if (isSupabaseConfigured && userId) {
    syncQuietly(() => upsertSessionCloud(session, userId));
  }
  return data;
}

export function deleteSession(id: string): AppData {
  const data = loadData();
  data.sessions = data.sessions.filter((s) => s.id !== id);
  saveData(data);
  if (isSupabaseConfigured && cloudUserId()) {
    syncQuietly(() => deleteSessionCloud(id));
  }
  return data;
}

export function sessionVolumeKg(session: Session): number {
  let total = 0;
  for (const log of session.logs) {
    for (const set of log.sets) {
      if (set.completed && set.reps && set.weightKg) {
        total += set.reps * set.weightKg;
      }
    }
  }
  return Math.round(total);
}

export function sessionDurationMin(session: Session): number | null {
  if (!session.endedAt) return null;
  const ms =
    new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function formatSeconds(totalSec: number): string {
  if (totalSec >= 60) {
    const rest = totalSec % 60;
    return `${Math.floor(totalSec / 60)} min ${rest ? `${rest}s` : ''}`.trim();
  }
  return `${totalSec}s`;
}

export function formatExerciseTarget(
  exerciseId: string,
  pe: {
    reps?: number;
    durationSec?: number;
    distanceM?: number;
  },
): string {
  const ex = getExerciseById(exerciseId);
  if (!ex) return '—';
  if (ex.tracking === 'reps') return `${pe.reps ?? '—'} reps`;
  if (ex.tracking === 'duration') return formatSeconds(pe.durationSec ?? 0);
  return `${pe.distanceM ?? '—'} m`;
}

/**
 * Temps d'effort par série : le champ dédié, sinon la durée pour les exercices
 * suivis en durée. Renvoie null si aucun temps n'est défini.
 */
export function exerciseWorkSeconds(pe: ProgramExercise): number | null {
  const seconds = pe.workDurationSec ?? pe.durationSec;
  return seconds && seconds > 0 ? seconds : null;
}
