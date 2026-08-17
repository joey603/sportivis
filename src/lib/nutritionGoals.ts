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

export type MacroTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type DayMacros = {
  key: string;
  date: Date;
  meals: Meal[];
  totals: MacroTotals;
};

export type MonthMacros = {
  key: string;
  date: Date;
  days: DayMacros[];
  totals: MacroTotals;
};

export function sumDayMacros(meals: Meal[]): MacroTotals {
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
  return compareIntake(sumDayMacros(meals), targets);
}

/** Même comparaison que pour un jour, mais sur des totaux déjà cumulés. */
export function compareIntake(
  totals: Pick<MacroTotals, 'kcal' | 'proteinG'>,
  targets: DailyTargets,
): DayComparison {
  return {
    kcal: progress(totals.kcal, targets.kcal),
    protein: progress(totals.proteinG, targets.proteinG),
  };
}

/** Cibles cumulées sur plusieurs jours (semaine, mois…). */
export function scaleTargets(
  targets: DailyTargets,
  days: number,
): DailyTargets {
  return {
    kcal: targets.kcal * days,
    proteinG: targets.proteinG * days,
  };
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function addTotals(base: MacroTotals, add: MacroTotals): MacroTotals {
  return {
    kcal: base.kcal + add.kcal,
    proteinG: base.proteinG + add.proteinG,
    carbsG: base.carbsG + add.carbsG,
    fatG: base.fatG + add.fatG,
  };
}

/**
 * Fenêtre glissante de `days` jours civils terminant aujourd'hui, du plus
 * ancien au plus récent. Les jours sans repas restent présents à zéro pour que
 * les graphes gardent un pas régulier.
 */
export function dailyMacroSeries(
  meals: Meal[],
  days: number,
  end = new Date(),
): DayMacros[] {
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(last);
    date.setDate(last.getDate() - (days - 1 - index));
    return {
      key: dayKey(date),
      date,
      meals: [] as Meal[],
      totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    };
  });
  const byKey = new Map(series.map((day) => [day.key, day]));

  for (const meal of meals) {
    const day = byKey.get(dayKey(new Date(meal.eatenAt)));
    if (!day) continue;
    day.meals.push(meal);
    day.totals = addTotals(day.totals, {
      kcal: meal.kcal,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
  }

  for (const day of series) {
    day.meals.sort(
      (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime(),
    );
  }
  return series;
}

/**
 * Historique complet regroupé par mois puis par jour, du plus récent au plus
 * ancien. Seuls les jours comportant au moins un repas apparaissent.
 */
export function groupMealsByMonth(meals: Meal[]): MonthMacros[] {
  const months = new Map<string, MonthMacros>();

  for (const meal of meals) {
    const eatenAt = new Date(meal.eatenAt);
    if (Number.isNaN(eatenAt.getTime())) continue;
    const mKey = monthKey(eatenAt);
    let month = months.get(mKey);
    if (!month) {
      month = {
        key: mKey,
        date: new Date(eatenAt.getFullYear(), eatenAt.getMonth(), 1),
        days: [],
        totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      };
      months.set(mKey, month);
    }

    const dKey = dayKey(eatenAt);
    let day = month.days.find((item) => item.key === dKey);
    if (!day) {
      day = {
        key: dKey,
        date: new Date(
          eatenAt.getFullYear(),
          eatenAt.getMonth(),
          eatenAt.getDate(),
        ),
        meals: [],
        totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      };
      month.days.push(day);
    }

    const mealTotals: MacroTotals = {
      kcal: meal.kcal,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    };
    day.meals.push(meal);
    day.totals = addTotals(day.totals, mealTotals);
    month.totals = addTotals(month.totals, mealTotals);
  }

  const sorted = [...months.values()].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
  for (const month of sorted) {
    month.days.sort((a, b) => b.date.getTime() - a.date.getTime());
    for (const day of month.days) {
      day.meals.sort(
        (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime(),
      );
    }
  }
  return sorted;
}
