import type { Locale, MessageKey } from '../i18n/messages';
import type { Exercise, MealItem } from '../types';
import {
  parseProgramImport,
  type ImportedProgram,
} from './programExchange';
import { supabase } from './supabase';

/**
 * Appels aux fonctions serverless qui interrogent Groq. La clé du modèle
 * reste côté serveur : le client s'authentifie avec son jeton Supabase, et le
 * quota journalier est décompté en base.
 */

export type AiFeature = 'program' | 'meal';

/** Code stable renvoyé par l'API, traduit en message par l'interface. */
export class AiError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function aiErrorCode(reason: unknown): string {
  return reason instanceof AiError ? reason.code : 'generic';
}

/**
 * Le code est conservé tel quel dans l'état des composants et traduit au
 * rendu : le message suit donc un changement de langue. Les codes non prévus
 * retombent sur un message générique.
 */
export function aiErrorMessage(
  code: string,
  t: (key: MessageKey) => string,
): string {
  const key = `ai.err.${code}` as MessageKey;
  const text = t(key);
  return text === key ? t('ai.err.generic') : text;
}

export type ProgramRequest = {
  locale: Locale;
  goal: string;
  level: string;
  sessionsPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  notes: string;
  customExercises: Exercise[];
};

export type GeneratedProgram = {
  program: ImportedProgram;
  warnings: string[];
  remaining: number;
};

export async function generateProgramAi(
  request: ProgramRequest,
): Promise<GeneratedProgram> {
  const { program, remaining } = await post<{
    program: unknown;
    remaining: number;
  }>('/api/generate-program', {
    ...request,
    customExercises: request.customExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      equipment: exercise.equipment,
      tracking: exercise.tracking,
      defaultRestSec: exercise.defaultRestSec,
    })),
  });

  // On repasse par le parseur tolérant : il valide les identifiants
  // d'exercices et remonte les corrections sous forme d'avertissements.
  const parsed = parseProgramImport(JSON.stringify(program));
  if (!parsed.ok) throw new AiError('ai_invalid_program');
  return { program: parsed.program, warnings: parsed.warnings, remaining };
}

export type AnalyzedMeal = {
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
};

export type MealClarifyingQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export type MealClarificationAnswer = {
  prompt: string;
  answer: string;
};

export type AnalyzeMealResult =
  | { status: 'ready'; meal: AnalyzedMeal; remaining: number }
  | {
      status: 'needs_clarification';
      questions: MealClarifyingQuestion[];
      remaining: number;
    };

export async function analyzeMealAi(
  description: string,
  locale: Locale,
  clarifications?: MealClarificationAnswer[],
): Promise<AnalyzeMealResult> {
  return post<AnalyzeMealResult>('/api/analyze-meal', {
    description,
    locale,
    clarifications: clarifications?.length ? clarifications : undefined,
  });
}

/** Recalcule les totaux après édition manuelle des items. */
export function totalsFromMealItems(items: MealItem[]): Omit<AnalyzedMeal, 'label' | 'items'> {
  return {
    kcal: Math.round(items.reduce((sum, item) => sum + item.kcal, 0)),
    proteinG: round1(items.reduce((sum, item) => sum + item.proteinG, 0)),
    carbsG: round1(items.reduce((sum, item) => sum + item.carbsG, 0)),
    fatG: round1(items.reduce((sum, item) => sum + item.fatG, 0)),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Solde d'appels restant aujourd'hui, ou null si l'info est indisponible. */
export async function fetchAiQuota(feature: AiFeature): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('ai_quota_remaining', {
    p_feature: feature,
  });
  if (error) {
    console.warn('[quota]', error);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const token = await accessToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok || !payload) {
    throw new AiError(payload?.error ?? 'server_error');
  }
  return payload;
}

async function accessToken(): Promise<string> {
  if (!supabase) throw new AiError('missing_token');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiError('missing_token');
  return token;
}
