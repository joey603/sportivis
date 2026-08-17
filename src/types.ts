export type TrackingType = 'reps' | 'duration' | 'distance';

export type Equipment =
  | 'machine'
  | 'haltères'
  | 'barre'
  | 'poulie'
  | 'poids_du_corps'
  | 'cardio'
  | 'kettlebell'
  | 'sport'
  | 'autre';

/** Intensité ressentie d'une pratique sportive, utilisée pour les calories. */
export type SportIntensity = 'faible' | 'moderee' | 'elevee';

export type MuscleGroup =
  | 'pectoraux'
  | 'dos'
  | 'épaules'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'ischio-jambiers'
  | 'fessiers'
  | 'mollets'
  | 'core'
  | 'cardio'
  | 'sport'
  | 'full_body';

export type Exercise = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  tracking: TrackingType;
  defaultRestSec: number;
  /**
   * MET de référence à intensité modérée. Renseigné pour les sports, où le
   * matériel ne suffit pas à estimer la dépense.
   */
  met?: number;
  tags?: string[];
  instructions?: string[];
  /** Exercice de la sélection supplémentaire (hors bibliothèque de base). */
  extra?: boolean;
  /** Exercice créé par l'utilisateur. */
  custom?: boolean;
};

export type ProgramExercise = {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  restSec: number;
  /** Temps d'effort visé par série, chronométrable pendant la séance. */
  workDurationSec?: number;
  targetWeightKg?: number;
  /** Renseignée pour les sports : ajuste les calories estimées. */
  intensity?: SportIntensity;
  notes?: string;
};

export type Program = {
  id: string;
  name: string;
  description?: string;
  exercises: ProgramExercise[];
  createdAt: string;
  updatedAt: string;
};

export type ProgramShare = {
  id: string;
  senderName: string;
  program: Program;
  /** Exercices personnels embarqués pour pouvoir afficher puis accepter l’aperçu. */
  customExercises: Exercise[];
  createdAt: string;
};

export type ProgramShareStatus = 'pending' | 'accepted' | 'rejected';

export type SentProgramShare = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  status: ProgramShareStatus;
  createdAt: string;
  respondedAt?: string;
};

export type SetLog = {
  setIndex: number;
  completed: boolean;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  distanceM?: number;
  intensity?: SportIntensity;
};

export type ExerciseLog = {
  programExerciseId: string;
  exerciseId: string;
  sets: SetLog[];
};

export type Session = {
  id: string;
  programId: string;
  programName: string;
  startedAt: string;
  endedAt?: string;
  logs: ExerciseLog[];
};

export type BiologicalSex = 'male' | 'female';

/** Aligné sur les objectifs IA / programmes. */
export type NutritionGoal =
  | 'masse'
  | 'perte'
  | 'force'
  | 'endurance'
  | 'forme';

export type UserProfile = {
  firstName: string;
  lastName: string;
  age: number;
  sex?: BiologicalSex;
  heightCm?: number;
  goal?: NutritionGoal;
  /** Séances d'entraînement prévues par semaine (1–7). */
  sessionsPerWeek?: number;
};

export type WeightEntry = {
  id: string;
  weightKg: number;
  recordedAt: string;
};

export type MealItem = {
  name: string;
  /** Quantité estimée, unité comprise (« 150 g », « 1 bol »). */
  quantity: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Meal = {
  id: string;
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
  eatenAt: string;
};

export type AppData = {
  programs: Program[];
  sessions: Session[];
  customExercises: Exercise[];
  profile?: UserProfile;
  weightEntries: WeightEntry[];
  incomingProgramShares: ProgramShare[];
  meals: Meal[];
};
