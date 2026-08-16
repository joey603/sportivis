import type { Exercise, ProgramExercise } from '../types';
import { createId, getAllExercises } from './storage';

/**
 * Échange de programmes avec un assistant type ChatGPT : on exporte le
 * catalogue d'exercices sous forme de consigne, et on réimporte sa réponse
 * JSON en tolérant les variantes de nommage qu'il produit souvent.
 */

export {
  buildChatGptPrompt,
  buildExerciseCatalog,
  buildFormatInstructions,
} from './programPrompt';

export type ImportedProgram = {
  name?: string;
  description?: string;
  exercises: ProgramExercise[];
};

export type ImportResult =
  | { ok: true; program: ImportedProgram; warnings: string[] }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Lecture tolérante du JSON                                          */
/* ------------------------------------------------------------------ */

/**
 * Un copier-coller depuis une conversation remplace souvent les guillemets
 * droits par des guillemets typographiques et les espaces par des insécables,
 * ce que JSON.parse refuse.
 */
function sanitizeCharacters(raw: string): string {
  return raw
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
    .replace(/[\u00a0\u2007\u2009\u202f\u3000]/g, ' ')
    .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"')
    .replace(/\r\n?/g, '\n');
}

type Segment = { isString: boolean; value: string };

/**
 * Découpe le texte en littéraux de chaîne et en code, commentaires retirés.
 * Les corrections ne s'appliquent qu'au code : le contenu des chaînes (un nom
 * d'exercice, une note) doit rester intact.
 */
function splitSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let code = '';
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === '"') {
      segments.push({ isString: false, value: code });
      code = '';
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === '\\') {
          end += 2;
          continue;
        }
        end += 1;
        if (text[end - 1] === '"') break;
      }
      segments.push({ isString: true, value: text.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '/' && text[index + 1] === '/') {
      const newline = text.indexOf('\n', index);
      index = newline === -1 ? text.length : newline;
      continue;
    }

    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      index = close === -1 ? text.length : close + 2;
      continue;
    }

    code += char;
    index += 1;
  }

  segments.push({ isString: false, value: code });
  return segments;
}

const UNIT = 'secondes?|seconds?|secs?|s|kilos?|kgs?|kg|repetitions?|reps?|rep|metres?|meters?|m';
const RANGE_SEPARATOR = '[-\u2013\u2014/x]|to|a|\u00e0|et|ou';

function toDecimal(value: string): number {
  return Number(value.replace(',', '.'));
}

function repairCode(chunk: string): string {
  return (
    chunk
      .replace(/'([^'\n]*)'/g, '"$1"')
      // Clés non citées, style objet JavaScript : { name: … }
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\b(?:None|NaN|undefined|Infinity)\b/g, 'null')
      // Intervalles « 8-12 », « 8 à 12 », « 3x10 » : on garde la première valeur.
      .replace(
        new RegExp(
          `(\\d+(?:[.,]\\d+)?)\\s*(?:${RANGE_SEPARATOR})\\s*\\d+(?:[.,]\\d+)?`,
          'gi',
        ),
        '$1',
      )
      // « 2 min » → 120 secondes.
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:min(?:ute)?s?|mn)\b/gi, (_match, value: string) =>
        String(Math.round(toDecimal(value) * 60)),
      )
      // Unités restantes : « 90s », « 50 kg », « 12 reps ».
      .replace(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${UNIT})\\b`, 'gi'), '$1')
      // Décimale à la virgule, en position de valeur uniquement.
      .replace(/:(\s*)\+?(\d+),(\d+)/g, ':$1$2.$3')
      .replace(/:(\s*)\+(\d)/g, ':$1$2')
      .replace(/,(\s*[}\]])/g, '$1')
      // Virgule oubliée entre deux entrées de la liste.
      .replace(/}(\s*){/g, '},$1{')
  );
}

/**
 * Réassemble le texte en rétablissant au passage les séparateurs oubliés entre
 * une valeur et le littéral suivant : « , » après une valeur, « : » après une
 * clé. On suit pour cela le rôle du dernier littéral rencontré.
 */
function repairJson(text: string): string {
  let result = '';
  let lastStringWasValue = false;

  for (const segment of splitSegments(text)) {
    if (!segment.isString) {
      result += repairCode(segment.value);
      continue;
    }

    const tail = result.replace(/\s+$/, '');
    if (/(?:[\d}\]]|true|false|null)$/.test(tail)) {
      // En JSON valide une valeur ne peut être suivie que de « , », « } », « ] ».
      result += ',';
      lastStringWasValue = false;
    } else if (tail.endsWith('"')) {
      result += lastStringWasValue ? ',' : ':';
      lastStringWasValue = !lastStringWasValue;
    } else {
      lastStringWasValue = tail.endsWith(':');
    }

    result += segment.value;
  }

  return result;
}

/** Isole la région allant de la première accolade à celle qui la referme. */
function balancedRegion(text: string): { text: string; balanced: boolean } | undefined {
  const start = text.search(/[[{]/);
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return { text: text.slice(start, index + 1), balanced: true };
      }
    }
  }

  return { text: text.slice(start), balanced: false };
}

/** Blocs candidats : chaque bloc de code d'abord, puis le texte entier. */
function buildCandidates(text: string): { text: string; balanced: boolean }[] {
  const candidates: { text: string; balanced: boolean }[] = [];
  const seen = new Set<string>();

  const sources = [
    ...[...text.matchAll(/```[\w-]*\s*([\s\S]*?)(?:```|$)/g)].map((match) => match[1]),
    text,
  ];

  for (const source of sources) {
    const region = balancedRegion(source);
    if (region && !seen.has(region.text)) {
      seen.add(region.text);
      candidates.push(region);
    }
  }

  return candidates;
}

function describeSyntaxError(error: unknown, text: string): string {
  const message = error instanceof Error ? error.message : '';
  const position = Number(message.match(/position (\d+)/)?.[1]);
  if (!Number.isFinite(position)) {
    return 'JSON illisible : demande à ChatGPT de renvoyer uniquement le bloc JSON, sans texte autour.';
  }

  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const source = text.split('\n')[line - 1]?.trim() ?? '';
  const excerpt = source.length > 70 ? `${source.slice(0, 70)}…` : source;
  return `JSON illisible ligne ${line}${excerpt ? ` : « ${excerpt} »` : ''}. Corrige cette ligne ou demande à ChatGPT de renvoyer le bloc en JSON strict.`;
}

function parseTolerant(input: string): { ok: true; data: unknown } | { ok: false; error: string } {
  const sanitized = sanitizeCharacters(input);
  const candidates = buildCandidates(sanitized);

  if (candidates.length === 0) {
    return {
      ok: false,
      error: 'Aucun bloc JSON trouvé : colle la réponse de ChatGPT, accolades comprises.',
    };
  }

  let firstError: string | undefined;

  for (const candidate of candidates) {
    for (const attempt of [candidate.text, repairJson(candidate.text)]) {
      try {
        return { ok: true, data: JSON.parse(attempt) };
      } catch (error) {
        if (firstError === undefined || !candidate.balanced) {
          firstError = candidate.balanced
            ? describeSyntaxError(error, attempt)
            : 'Le bloc collé est incomplet : la dernière accolade fermante manque. Recopie toute la réponse.';
        }
      }
    }
  }

  return { ok: false, error: firstError ?? 'JSON illisible.' };
}

/* ------------------------------------------------------------------ */
/* Interprétation du programme                                        */
/* ------------------------------------------------------------------ */

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
  if (Array.isArray(value)) return toNumber(value[0]);
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

const LIST_KEYS = [
  'exercises',
  'exercices',
  'items',
  'program',
  'programme',
  'seance',
  'seances',
  'workout',
  'workouts',
  'days',
  'jours',
  'blocks',
  'blocs',
  'routine',
];

function looksLikeExercise(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const index = keyIndex(value as Record<string, unknown>);
  // Une entrée qui contient elle-même une liste est un regroupement (un jour…).
  if (LIST_KEYS.some((key) => Array.isArray(index.get(key)))) return false;
  return REFERENCE_KEYS.some((key) => index.get(key) !== undefined);
}

/**
 * Cherche les listes d'exercices où qu'elles soient : ChatGPT imbrique souvent
 * le programme sous une clé « programme », ou le découpe en journées.
 */
function collectExerciseLists(value: unknown, found: unknown[][], depth = 0): void {
  if (depth > 6 || !value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    const matches = value.filter(looksLikeExercise).length;
    if (matches > 0 && matches * 2 >= value.length) {
      found.push(value);
      return;
    }
    for (const item of value) collectExerciseLists(item, found, depth + 1);
    return;
  }

  for (const child of Object.values(value)) {
    collectExerciseLists(child, found, depth + 1);
  }
}

function findText(value: unknown, aliases: string[], depth: number): string | undefined {
  if (!value || typeof value !== 'object' || depth < 0) return undefined;
  if (!Array.isArray(value)) {
    if (looksLikeExercise(value)) return undefined;
    const direct = toText(pick(keyIndex(value as Record<string, unknown>), aliases));
    if (direct) return direct;
  }
  for (const child of Object.values(value)) {
    const nested = findText(child, aliases, depth - 1);
    if (nested) return nested;
  }
  return undefined;
}

export function parseProgramImport(input: string): ImportResult {
  if (!input.trim()) {
    return { ok: false, error: 'Colle d’abord le programme reçu de ChatGPT.' };
  }

  const parsed = parseTolerant(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data = parsed.data;
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Le contenu collé n’est pas un programme.' };
  }

  const lists: unknown[][] = [];
  collectExerciseLists(data, lists);
  if (lists.length === 0) {
    return {
      ok: false,
      error:
        'Aucune liste d’exercices trouvée : le JSON doit contenir un tableau « exercises ».',
    };
  }

  const catalog = getAllExercises();
  const warnings: string[] = [];
  const exercises: ProgramExercise[] = [];

  if (lists.length > 1) {
    warnings.push(
      `${lists.length} séances détectées : leurs exercices ont été réunis dans un seul programme.`,
    );
  }

  for (const raw of lists.flat()) {
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
      name: findText(data, ['name', 'nom', 'title', 'titre', 'programname'], 2),
      description: findText(
        data,
        ['description', 'desc', 'objectif', 'goal', 'resume'],
        2,
      ),
      exercises,
    },
  };
}
