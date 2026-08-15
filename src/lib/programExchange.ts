import type { Exercise, ProgramExercise } from '../types';
import { createId, getAllExercises } from './storage';

/**
 * Échange de programmes avec un assistant type ChatGPT : on exporte le
 * catalogue d'exercices sous forme de consigne, et on réimporte sa réponse
 * JSON en tolérant les variantes de nommage qu'il produit souvent.
 */

const FORMAT_EXAMPLE = `{
  "name": "Haut du corps - force",
  "description": "Séance poussée/tirage, 2 fois par semaine",
  "exercises": [
    { "exerciseId": "bench-press-bar", "sets": 4, "reps": 8, "restSec": 120, "targetWeightKg": 50 },
    { "exerciseId": "plank", "sets": 3, "durationSec": 45, "restSec": 30 }
  ]
}`;

export function buildFormatInstructions(): string {
  return `Réponds UNIQUEMENT avec un bloc JSON valide, sans texte autour, exactement à ce format :

${FORMAT_EXAMPLE}

Règles :
- "exerciseId" doit être un identifiant repris de la colonne « id » de la liste ci-dessous, jamais un nom libre.
- Exercice suivi en "reps" : utilise "reps". En "duree" : utilise "durationSec". En "distance" : utilise "distanceM".
- "restSec" est le repos entre séries, en secondes.
- Optionnels : "targetWeightKg" (charge visée), "workDurationSec" (temps d'effort chronométré par série), "notes".`;
}

export function buildExerciseCatalog(exercises: Exercise[]): string {
  const lines = exercises.map(
    (exercise) =>
      `${exercise.id} | ${exercise.name} | ${exercise.muscle} | ${exercise.equipment.replace(/_/g, ' ')} | ${trackingLabel(exercise)} | ${exercise.defaultRestSec}s`,
  );
  return lines.join('\n');
}

export function buildChatGptPrompt(exercises: Exercise[]): string {
  return `Tu es coach sportif. Construis-moi un programme d'entraînement adapté à mon objectif (précise-le lui : prise de masse, perte de poids, force…).

${buildFormatInstructions()}

Exercices disponibles (${exercises.length}) — format « id | nom | muscle | équipement | suivi | repos par défaut » :
${buildExerciseCatalog(exercises)}`;
}

function trackingLabel(exercise: Exercise): string {
  if (exercise.tracking === 'reps') return 'reps';
  if (exercise.tracking === 'duration') return 'duree';
  return 'distance';
}

export type ImportedProgram = {
  name?: string;
  description?: string;
  exercises: ProgramExercise[];
};

export type ImportResult =
  | { ok: true; program: ImportedProgram; warnings: string[] }
  | { ok: false; error: string };

/** Retire les balises Markdown et le texte qui entoure éventuellement le JSON. */
function extractJson(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (end >= 0 && end < text.length - 1) text = text.slice(0, end + 1);
  return text.trim();
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Index les clés d'un objet par forme normalisée : « restSec », « repos_sec »… */
function keyIndex(entry: Record<string, unknown>): Map<string, unknown> {
  const index = new Map<string, unknown>();
  for (const [key, value] of Object.entries(entry)) {
    index.set(normalize(key).replace(/ /g, ''), value);
  }
  return index;
}

function pick(index: Map<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const value = index.get(alias);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    // « 8-12 reps » → 8 : on retient la première valeur de l'intervalle.
    const match = value.replace(',', '.').match(/\d+(\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveExercise(
  reference: string,
  catalog: Exercise[],
): Exercise | undefined {
  const exact = catalog.find((exercise) => exercise.id === reference);
  if (exact) return exact;
  const target = normalize(reference);
  if (!target) return undefined;
  return (
    catalog.find((exercise) => normalize(exercise.id) === target) ??
    catalog.find((exercise) => normalize(exercise.name) === target) ??
    catalog.find((exercise) => normalize(exercise.name).includes(target)) ??
    (target.length >= 5
      ? catalog.find((exercise) => target.includes(normalize(exercise.name)))
      : undefined)
  );
}

const REFERENCE_KEYS = [
  'exerciseid',
  'id',
  'exercise',
  'exercice',
  'name',
  'nom',
  'exercisename',
  'nomexercice',
];

export function parseProgramImport(input: string): ImportResult {
  const text = extractJson(input);
  if (!text) {
    return { ok: false, error: 'Colle d’abord le programme reçu de ChatGPT.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error:
        'JSON illisible : vérifie que tout le bloc a été copié, accolades comprises.',
    };
  }

  const root = Array.isArray(data)
    ? { exercises: data }
    : typeof data === 'object' && data
      ? (data as Record<string, unknown>)
      : null;
  if (!root) {
    return { ok: false, error: 'Le contenu collé n’est pas un programme.' };
  }

  const rootIndex = keyIndex(root);
  const rawList = pick(rootIndex, [
    'exercises',
    'exercices',
    'items',
    'program',
    'programme',
    'seance',
    'workout',
  ]);
  if (!Array.isArray(rawList)) {
    return {
      ok: false,
      error: 'Aucune liste « exercises » trouvée dans le JSON.',
    };
  }

  const catalog = getAllExercises();
  const warnings: string[] = [];
  const exercises: ProgramExercise[] = [];

  for (const raw of rawList) {
    const entry: Record<string, unknown> =
      typeof raw === 'string'
        ? { exerciseId: raw }
        : typeof raw === 'object' && raw
          ? (raw as Record<string, unknown>)
          : {};
    const index = keyIndex(entry);
    const reference = toText(pick(index, REFERENCE_KEYS));
    if (!reference) {
      warnings.push('Une entrée sans identifiant d’exercice a été ignorée.');
      continue;
    }

    const exercise = resolveExercise(reference, catalog);
    if (!exercise) {
      warnings.push(`« ${reference} » ne correspond à aucun exercice : ignoré.`);
      continue;
    }

    const sets = toNumber(pick(index, ['sets', 'series', 'nbseries', 'nombredeseries']));
    const rest = toNumber(
      pick(index, ['restsec', 'rest', 'repos', 'repossec', 'resttime', 'restseconds']),
    );
    const work = toNumber(
      pick(index, ['workdurationsec', 'work', 'effort', 'tempsdeffort', 'workseconds']),
    );

    const programExercise: ProgramExercise = {
      id: createId(),
      exerciseId: exercise.id,
      sets: sets ? clamp(sets, 1, 20) : 3,
      restSec: rest !== undefined ? clamp(rest, 0, 900) : exercise.defaultRestSec,
    };

    if (exercise.tracking === 'reps') {
      const reps = toNumber(pick(index, ['reps', 'repetitions', 'rep']));
      programExercise.reps = reps ? clamp(reps, 1, 200) : 10;
      const weight = toNumber(
        pick(index, ['targetweightkg', 'weight', 'charge', 'poids', 'kg', 'weightkg']),
      );
      if (weight !== undefined && weight > 0) {
        programExercise.targetWeightKg = Math.round(weight * 2) / 2;
      }
    } else if (exercise.tracking === 'duration') {
      const duration = toNumber(
        pick(index, ['durationsec', 'duration', 'duree', 'dureesec', 'temps', 'seconds']),
      );
      programExercise.durationSec = duration ? clamp(duration, 1, 3600) : 60;
    } else {
      const distance = toNumber(
        pick(index, ['distancem', 'distance', 'metres', 'meters']),
      );
      programExercise.distanceM = distance ? clamp(distance, 1, 100000) : 100;
    }

    if (work !== undefined && work > 0 && exercise.tracking !== 'duration') {
      programExercise.workDurationSec = clamp(work, 1, 3600);
    }

    const notes = toText(pick(index, ['notes', 'note', 'remarque', 'commentaire']));
    if (notes) programExercise.notes = notes;

    exercises.push(programExercise);
  }

  if (exercises.length === 0) {
    return {
      ok: false,
      error:
        'Aucun exercice reconnu. Utilise les identifiants exportés depuis la bibliothèque.',
    };
  }

  return {
    ok: true,
    warnings,
    program: {
      name: toText(pick(rootIndex, ['name', 'nom', 'title', 'titre', 'programname'])),
      description: toText(
        pick(rootIndex, ['description', 'desc', 'objectif', 'goal', 'resume']),
      ),
      exercises,
    },
  };
}
