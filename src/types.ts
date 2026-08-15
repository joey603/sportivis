export type TrackingType = 'reps' | 'duration' | 'distance';

export type Equipment =
  | 'machine'
  | 'haltères'
  | 'barre'
  | 'poulie'
  | 'poids_du_corps'
  | 'cardio'
  | 'kettlebell'
  | 'autre';

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
  | 'full_body';

export type Exercise = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  tracking: TrackingType;
  defaultRestSec: number;
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

export type SetLog = {
  setIndex: number;
  completed: boolean;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  distanceM?: number;
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

export type UserProfile = {
  firstName: string;
  lastName: string;
  age: number;
};

export type WeightEntry = {
  id: string;
  weightKg: number;
  recordedAt: string;
};

export type AppData = {
  programs: Program[];
  sessions: Session[];
  customExercises: Exercise[];
  profile?: UserProfile;
  weightEntries: WeightEntry[];
};
