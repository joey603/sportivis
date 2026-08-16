import type { Equipment, Exercise, MuscleGroup, Session, SetLog } from '../types';
import { getExerciseById, sessionDurationMin } from './storage';

const DEFAULT_BODY_WEIGHT_KG = 75;
const SETTINGS_KEY = 'sportivis-settings-v1';

export type UserSettings = {
  bodyWeightKg: number;
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { bodyWeightKg: DEFAULT_BODY_WEIGHT_KG };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const weight = Number(parsed.bodyWeightKg);
    return {
      bodyWeightKg:
        Number.isFinite(weight) && weight > 0
          ? Math.min(300, Math.max(30, weight))
          : DEFAULT_BODY_WEIGHT_KG,
    };
  } catch {
    return { bodyWeightKg: DEFAULT_BODY_WEIGHT_KG };
  }
}

export function saveBodyWeightKg(kg: number): UserSettings {
  const settings: UserSettings = {
    bodyWeightKg: Math.min(300, Math.max(30, Math.round(kg * 10) / 10)),
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('sportivis-data'));
  return settings;
}

export function clearSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

/** MET approximatif selon le type d’exercice (références ACSM / Compendium). */
export function exerciseMet(exercise: Exercise | undefined): number {
  if (!exercise) return 4.5;

  if (exercise.equipment === 'cardio' || exercise.muscle === 'cardio') {
    return 7.5;
  }
  if (exercise.equipment === 'kettlebell') return 6.5;
  if (exercise.muscle === 'core') return 3.8;
  if (exercise.equipment === 'poids_du_corps') {
    return compoundMuscle(exercise.muscle) ? 6 : 4.5;
  }
  if (exercise.equipment === 'barre') {
    return compoundMuscle(exercise.muscle) ? 6 : 4.5;
  }
  if (exercise.equipment === 'haltères') {
    return compoundMuscle(exercise.muscle) ? 5.5 : 4;
  }
  if (exercise.equipment === 'machine' || exercise.equipment === 'poulie') {
    return compoundMuscle(exercise.muscle) ? 5 : 3.8;
  }

  return metForEquipment(exercise.equipment);
}

function compoundMuscle(muscle: MuscleGroup): boolean {
  return (
    muscle === 'full_body' ||
    muscle === 'quadriceps' ||
    muscle === 'dos' ||
    muscle === 'pectoraux' ||
    muscle === 'fessiers' ||
    muscle === 'ischio-jambiers'
  );
}

function metForEquipment(equipment: Equipment): number {
  switch (equipment) {
    case 'cardio':
      return 7.5;
    case 'kettlebell':
      return 6.5;
    case 'barre':
      return 5.5;
    case 'haltères':
      return 5;
    case 'poids_du_corps':
      return 5;
    case 'machine':
    case 'poulie':
      return 4;
    default:
      return 4.5;
  }
}

function setWorkSeconds(set: SetLog, exercise: Exercise | undefined): number {
  if (set.durationSec && set.durationSec > 0) return set.durationSec;
  if (set.distanceM && set.distanceM > 0) {
    // ~5 min / km marche-course légère en salle
    return Math.max(20, Math.round((set.distanceM / 1000) * 300));
  }
  if (set.reps && set.reps > 0) {
    // ~2.8 s par répétition (tempo salle)
    return Math.max(8, Math.round(set.reps * 2.8));
  }
  if (exercise?.tracking === 'duration') return 45;
  return 20;
}

function intensityFactor(
  set: SetLog,
  bodyWeightKg: number,
  exercise: Exercise | undefined,
): number {
  if (!set.weightKg || set.weightKg <= 0 || !exercise || exercise.tracking !== 'reps') {
    return 1;
  }
  const ratio = set.weightKg / bodyWeightKg;
  return 1 + Math.min(0.45, ratio * 0.2);
}

/**
 * Estimation de l'énergie dépensée pendant une série, hors temps de repos.
 * Un chiffre après la virgule évite d'afficher 0 pour les séries courtes.
 */
export function setCaloriesKcal(
  set: SetLog,
  exercise: Exercise | undefined,
  bodyWeightKg = loadSettings().bodyWeightKg,
): number {
  const weight =
    bodyWeightKg > 0 ? bodyWeightKg : DEFAULT_BODY_WEIGHT_KG;
  const seconds = setWorkSeconds(set, exercise);
  const kcal =
    exerciseMet(exercise) *
    intensityFactor(set, weight, exercise) *
    weight *
    (seconds / 3600);
  return Math.max(0, Math.round(kcal * 10) / 10);
}

/**
 * Estimation des calories brûlées pour une séance.
 * Formule de base : kcal = MET × poids (kg) × durée (h).
 */
export function sessionCaloriesKcal(
  session: Session,
  bodyWeightKg = loadSettings().bodyWeightKg,
): number {
  const weight = bodyWeightKg > 0 ? bodyWeightKg : DEFAULT_BODY_WEIGHT_KG;
  let workSeconds = 0;
  let activeKcal = 0;

  for (const log of session.logs) {
    const exercise = getExerciseById(log.exerciseId);
    const met = exerciseMet(exercise);
    for (const set of log.sets) {
      if (!set.completed) continue;
      const seconds = setWorkSeconds(set, exercise);
      workSeconds += seconds;
      const hours = seconds / 3600;
      activeKcal += met * intensityFactor(set, weight, exercise) * weight * hours;
    }
  }

  const durationMin = sessionDurationMin(session);
  if (durationMin != null) {
    const totalSeconds = durationMin * 60;
    const restSeconds = Math.max(0, totalSeconds - workSeconds);
    // Repos / transitions en salle ≈ MET 1.8
    activeKcal += 1.8 * weight * (restSeconds / 3600);

    // Si aucune série cochée, estimation globale musculation (MET ~5)
    if (workSeconds === 0) {
      activeKcal = 5 * weight * (durationMin / 60);
    }
  }

  return Math.max(0, Math.round(activeKcal));
}
