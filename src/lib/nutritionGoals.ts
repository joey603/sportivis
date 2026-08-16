import type {
  BiologicalSex,
  Meal,
  NutritionGoal,
  UserProfile,
} from '../types';
import { loadSettings } from './calories';

export type DailyTargets = {
  kcal: number;
  proteinG: number;
};

export type MacroProgress = {
  actual: number;
  goal: number;
  delta: number;
  percent: number;
  over: boolean;
};

export type DayComparison = {
  kcal: MacroProgress;
  protein: MacroProgress;
};

export type NutritionInputs = {
  age: number;
  sex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  goal: NutritionGoal;
  sessionsPerWeek: number;
};

/** Activité quotidienne de base hors séances sportives. */
const BASE_ACTIVITY_FACTOR = 1.2;

/**
 * Intensité moyenne d'une séance d'une heure, en MET.
 * La dépense estimée d'une séance vaut MET × poids (kg).
 */
const SESSION_MET: Record<NutritionGoal, number> = {
  masse: 5,
  perte: 6,
  force: 5,
  endurance: 7,
  forme: 5.5,
};

/** Ajustement par rapport au maintien, après ajout des séances. */
const GOAL_CALORIE_FACTOR: Record<NutritionGoal, number> = {
  masse: 1.12,
  perte: 0.82,
  force: 1.07,
  endurance: 1,
  forme: 1,
};

const PROTEIN_PER_KG: Record<NutritionGoal, number> = {
  masse: 2,
  perte: 2.2,
  force: 1.9,
  endurance: 1.6,
  forme: 1.6,
};

export const NUTRITION_GOALS: readonly NutritionGoal[] = [
  'masse',
  'perte',
  'force',
  'endurance',
  'forme',
] as const;

/** Champs biométriques + objectif nécessaires au calcul. */
export function isNutritionProfileComplete(
  profile: UserProfile | undefined,
  weightKg = loadSettings().bodyWeightKg,
): profile is UserProfile &
  Required<
    Pick<
      UserProfile,
      'sex' | 'heightCm' | 'goal' | 'sessionsPerWeek'
    >
  > {
  if (!profile) return false;
  if (!profile.sex || !profile.goal) return false;
  if (!Number.isFinite(profile.age) || profile.age < 13 || profile.age > 120) {
    return false;
  }
  if (
    !Number.isFinite(profile.heightCm) ||
    (profile.heightCm ?? 0) < 120 ||
    (profile.heightCm ?? 0) > 250
  ) {
    return false;
  }
  if (
    !Number.isFinite(profile.sessionsPerWeek) ||
    (profile.sessionsPerWeek ?? 0) < 1 ||
    (profile.sessionsPerWeek ?? 0) > 7
  ) {
    return false;
  }
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
    return false;
  }
  return true;
}

export function resolveNutritionInputs(
  profile: UserProfile | undefined,
  weightKg = loadSettings().bodyWeightKg,
): NutritionInputs | null {
  if (!isNutritionProfileComplete(profile, weightKg)) return null;
  return {
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg,
    goal: profile.goal,
    sessionsPerWeek: profile.sessionsPerWeek,
  };
}

/** Mifflin–St Jeor. */
export function basalMetabolicRate(input: {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === 'male' ? base + 5 : base - 161;
}

export function computeDailyTargets(input: NutritionInputs): DailyTargets {
  const bmr = basalMetabolicRate(input);
  const baseDailyNeed = bmr * BASE_ACTIVITY_FACTOR;
  const weeklyTrainingKcal =
    SESSION_MET[input.goal] * input.weightKg * input.sessionsPerWeek;
  const maintenanceKcal = baseDailyNeed + weeklyTrainingKcal / 7;
  let kcal = maintenanceKcal * GOAL_CALORIE_FACTOR[input.goal];

  const floor = input.sex === 'male' ? 1500 : 1200;
  kcal = Math.max(floor, Math.round(kcal / 10) * 10);

  const proteinG = Math.round(input.weightKg * PROTEIN_PER_KG[input.goal]);

  return { kcal, proteinG };
}

/** Cibles du jour recalculées depuis le profil et l’objectif enregistrés. */
export function resolveDailyTargets(
  profile: UserProfile | undefined,
  weightKg = loadSettings().bodyWeightKg,
): DailyTargets | null {
  const inputs = resolveNutritionInputs(profile, weightKg);
  return inputs ? computeDailyTargets(inputs) : null;
}

export function sumDayMacros(meals: Meal[]): {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      proteinG: sum.proteinG + meal.proteinG,
      carbsG: sum.carbsG + meal.carbsG,
      fatG: sum.fatG + meal.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

function progress(actual: number, goal: number): MacroProgress {
  const safeGoal = Math.max(1, goal);
  return {
    actual,
    goal,
    delta: goal - actual,
    percent: Math.min(100, Math.round((actual / safeGoal) * 100)),
    over: actual > goal,
  };
}

export function compareDayIntake(
  meals: Meal[],
  targets: DailyTargets,
): DayComparison {
  const actual = sumDayMacros(meals);
  return {
    kcal: progress(actual.kcal, targets.kcal),
    protein: progress(actual.proteinG, targets.proteinG),
  };
}
