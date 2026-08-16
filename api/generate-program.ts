import { EXERCISES } from '../src/data/exercises.js';
import type { Locale } from '../src/i18n/messages';
import {
  buildExerciseCatalog,
  buildFormatInstructions,
} from '../src/lib/programPrompt.js';
import type { Exercise } from '../src/types';
import {
  assertLlmConfigured,
  generateJson,
  type JsonSchema,
} from './_lib/llm.js';
import {
  asRecord,
  bearerToken,
  readInt,
  readJsonBody,
  readString,
  requirePost,
  sendError,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib/http.js';
import { consumeQuota } from './_lib/quota.js';

export const config = { maxDuration: 30 };

const GOALS = ['masse', 'perte', 'force', 'endurance', 'forme'] as const;
const LEVELS = ['debutant', 'intermediaire', 'avance'] as const;

type Goal = (typeof GOALS)[number];
type Level = (typeof LEVELS)[number];

const GOAL_TEXT: Record<Locale, Record<Goal, string>> = {
  fr: {
    masse: 'prise de masse musculaire (hypertrophie)',
    perte: 'perte de poids avec maintien de la masse musculaire',
    force: 'gain de force maximale',
    endurance: 'endurance et condition physique',
    forme: 'remise en forme générale',
  },
  he: {
    masse: 'עלייה במסת שריר (היפרטרופיה)',
    perte: 'ירידה במשקל תוך שמירה על מסת שריר',
    force: 'הגדלת כוח מקסימלי',
    endurance: 'סבולת וכושר גופני',
    forme: 'חזרה לכושר כללי',
  },
};

const LEVEL_TEXT: Record<Locale, Record<Level, string>> = {
  fr: {
    debutant: 'débutant',
    intermediaire: 'intermédiaire',
    avance: 'avancé',
  },
  he: { debutant: 'מתחיל', intermediaire: 'בינוני', avance: 'מתקדם' },
};

const PROGRAM_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'integer' },
          durationSec: { type: 'integer' },
          distanceM: { type: 'integer' },
          restSec: { type: 'integer' },
          targetWeightKg: { type: 'number' },
          workDurationSec: { type: 'integer' },
          notes: { type: 'string' },
        },
        // Strict JSON Schema : toutes les clés déclarées doivent être requises.
        required: [
          'exerciseId',
          'sets',
          'reps',
          'durationSec',
          'distanceM',
          'restSec',
          'targetWeightKg',
          'workDurationSec',
          'notes',
        ],
      },
    },
  },
  required: ['name', 'description', 'exercises'],
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    requirePost(req);
    assertLlmConfigured();
    const token = bearerToken(req);
    const body = asRecord(await readJsonBody(req));

    const locale: Locale = body.locale === 'he' ? 'he' : 'fr';
    const goal = pick(readString(body, 'goal', 20), GOALS, 'masse');
    const level = pick(readString(body, 'level', 20), LEVELS, 'debutant');
    const sessionsPerWeek = readInt(body, 'sessionsPerWeek', 1, 7, 3);
    const sessionMinutes = readInt(body, 'sessionMinutes', 15, 180, 60);
    const equipment = readEquipment(body.equipment);
    const notes = readString(body, 'notes', 400);
    const customExercises = readCustomExercises(body.customExercises);

    const remaining = await consumeQuota(token, 'program');

    const catalog = buildCatalog(equipment, customExercises);
    const program = await generateJson<unknown>({
      systemInstruction:
        locale === 'he'
          ? 'אתה מאמן כושר מקצועי. אתה בונה תוכניות אימון בטוחות, מאוזנות וישימות בחדר כושר. אם שדה אופציונלי אינו רלוונטי (reps / durationSec / distanceM / targetWeightKg / workDurationSec / notes), החזר 0 או מחרוזת ריקה.'
          : "Tu es coach sportif professionnel. Tu construis des programmes sûrs, équilibrés et réalisables en salle. Si un champ optionnel n'est pas pertinent (reps / durationSec / distanceM / targetWeightKg / workDurationSec / notes), renvoie 0 ou une chaîne vide.",
      prompt: buildPrompt({
        locale,
        goal,
        level,
        sessionsPerWeek,
        sessionMinutes,
        notes,
        catalog,
      }),
      schema: PROGRAM_SCHEMA,
      schemaName: 'workout_program',
      purpose: 'program',
      temperature: 0.6,
    });

    sendJson(res, 200, { program, remaining });
  } catch (error) {
    sendError(res, error);
  }
}

function buildPrompt(input: {
  locale: Locale;
  goal: Goal;
  level: Level;
  sessionsPerWeek: number;
  sessionMinutes: number;
  notes: string;
  catalog: Exercise[];
}): string {
  const { locale, catalog } = input;
  const goalText = GOAL_TEXT[locale][input.goal];
  const levelText = LEVEL_TEXT[locale][input.level];

  const brief =
    locale === 'he'
      ? `בנה אימון אחד למטרה: ${goalText}.
רמת המתאמן: ${levelText}.
תדירות: ${input.sessionsPerWeek} אימונים בשבוע.
משך האימון הרצוי: כ-${input.sessionMinutes} דקות, כולל מנוחות.
בחר בין 5 ל-10 תרגילים בסדר הגיוני (מורכבים לפני מבודדים).${
          input.notes
            ? `\nבקשות מיוחדות ומגבלות של המתאמן (יש לכבד אותן בעדיפות): ${input.notes}`
            : ''
        }`
      : `Construis UNE séance pour l'objectif : ${goalText}.
Niveau du pratiquant : ${levelText}.
Fréquence : ${input.sessionsPerWeek} séances par semaine.
Durée visée : environ ${input.sessionMinutes} minutes, repos compris.
Choisis entre 5 et 10 exercices dans un ordre cohérent (polyarticulaires avant isolation).${
          input.notes
            ? `\nDemandes particulières et contraintes du pratiquant (à respecter en priorité) : ${input.notes}`
            : ''
        }`;

  const catalogHeader =
    locale === 'he'
      ? `תרגילים זמינים (${catalog.length}) — פורמט « id | שם | שריר | ציוד | מעקב | מנוחה ברירת מחדל » :`
      : `Exercices disponibles (${catalog.length}) — format « id | nom | muscle | équipement | suivi | repos par défaut » :`;

  return `${brief}

${buildFormatInstructions(locale)}

${catalogHeader}
${buildExerciseCatalog(catalog, locale)}`;
}

/**
 * Restreindre le catalogue au matériel disponible guide le modèle et réduit la
 * taille du prompt. Le poids du corps reste toujours proposable.
 */
function buildCatalog(equipment: string[], custom: Exercise[]): Exercise[] {
  const library = equipment.length
    ? EXERCISES.filter(
        (exercise) =>
          equipment.includes(exercise.equipment) ||
          exercise.equipment === 'poids_du_corps',
      )
    : EXERCISES;
  return [...custom, ...library];
}

function pick<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const EQUIPMENT_VALUES = [
  'machine',
  'haltères',
  'barre',
  'poulie',
  'poids_du_corps',
  'cardio',
  'kettlebell',
  'autre',
];

function readEquipment(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .filter((item) => EQUIPMENT_VALUES.includes(item))
    .slice(0, EQUIPMENT_VALUES.length);
}

/** Les exercices personnels de l'utilisateur ne vivent que sur son appareil. */
function readCustomExercises(value: unknown): Exercise[] {
  if (!Array.isArray(value)) return [];
  const result: Exercise[] = [];
  for (const item of value.slice(0, 60)) {
    const record = asRecord(item);
    const id = readString(record, 'id', 64);
    const name = readString(record, 'name', 80);
    if (!id || !name) continue;
    result.push({
      id,
      name,
      muscle: readString(record, 'muscle', 24) as Exercise['muscle'],
      equipment: readString(record, 'equipment', 24) as Exercise['equipment'],
      tracking: pick(readString(record, 'tracking', 12), [
        'reps',
        'duration',
        'distance',
      ] as const, 'reps'),
      defaultRestSec: readInt(record, 'defaultRestSec', 0, 600, 60),
      custom: true,
    });
  }
  return result;
}
