import {
  localizeEquipment,
  localizeExerciseName,
  localizeMuscle,
} from '../i18n/exercises.js';
import type { Locale } from '../i18n/messages';
import type { Exercise } from '../types';

/**
 * Consignes et catalogue d'exercices décrivant le programme attendu. Ce module
 * ne dépend ni du navigateur ni du stockage local : il est partagé par
 * l'interface (copier-coller vers ChatGPT) et par les fonctions serverless
 * qui interrogent Groq.
 */

const FORMAT_EXAMPLE_FR = `{
  "name": "Haut du corps - force",
  "description": "Séance poussée/tirage, 2 fois par semaine",
  "exercises": [
    { "exerciseId": "bench-press-bar", "sets": 4, "reps": 8, "restSec": 120, "targetWeightKg": 50 },
    { "exerciseId": "plank", "sets": 3, "durationSec": 45, "restSec": 30 }
  ]
}`;

const FORMAT_EXAMPLE_HE = `{
  "name": "פלג גוף עליון - כוח",
  "description": "אימון דחיפה/משיכה, פעמיים בשבוע",
  "exercises": [
    { "exerciseId": "bench-press-bar", "sets": 4, "reps": 8, "restSec": 120, "targetWeightKg": 50 },
    { "exerciseId": "plank", "sets": 3, "durationSec": 45, "restSec": 30 }
  ]
}`;

export function buildFormatInstructions(locale: Locale = 'fr'): string {
  if (locale === 'he') {
    return `השב אך ורק עם בלוק קוד JSON תקין, בלי טקסט מסביב, בדיוק בפורמט הזה:

${FORMAT_EXAMPLE_HE}

כללים:
- "exerciseId" חייב להיות מזהה מעמודת « id » ברשימה למטה, לעולם לא שם חופשי.
- תרגיל במעקב "reps" : השתמש ב-"reps". במעקב "duree" : השתמש ב-"durationSec". במעקב "distance" : השתמש ב-"distanceM".
- "restSec" הוא זמן המנוחה בין סטים, בשניות.
- אופציונליים : "targetWeightKg" (משקל יעד), "workDurationSec" (זמן מאמץ מתוזמן לכל סט), "notes".
- אובייקט JSON אחד בלבד, מה-{ הראשון עד ה-} האחרון, בלי הערות.
- כל מספר הוא ערך יחיד, בלי יחידה ובלי טווח : כתוב 8 ולא "8-12", 120 ולא "120s".
- מרכאות ישרות (") בלבד, לעולם לא מרכאות טיפוגרפיות.`;
  }

  return `Réponds UNIQUEMENT avec un bloc de code JSON valide, sans texte autour, exactement à ce format :

${FORMAT_EXAMPLE_FR}

Règles :
- "exerciseId" doit être un identifiant repris de la colonne « id » de la liste ci-dessous, jamais un nom libre.
- Exercice suivi en "reps" : utilise "reps". En "duree" : utilise "durationSec". En "distance" : utilise "distanceM".
- "restSec" est le repos entre séries, en secondes.
- Optionnels : "targetWeightKg" (charge visée), "workDurationSec" (temps d'effort chronométré par série), "notes".
- Un seul objet JSON, du premier { au dernier }, sans commentaire.
- Chaque nombre est une valeur unique, sans unité ni intervalle : écris 8 et non "8-12", 120 et non "120s".
- Guillemets droits (") uniquement, jamais de guillemets typographiques.`;
}

export function buildExerciseCatalog(
  exercises: Exercise[],
  locale: Locale = 'fr',
): string {
  const lines = exercises.map(
    (exercise) =>
      `${exercise.id} | ${localizeExerciseName(exercise, locale)} | ${localizeMuscle(exercise.muscle, locale)} | ${localizeEquipment(exercise.equipment, locale)} | ${trackingLabel(exercise)} | ${exercise.defaultRestSec}s`,
  );
  return lines.join('\n');
}

export function buildChatGptPrompt(
  exercises: Exercise[],
  locale: Locale = 'fr',
): string {
  if (locale === 'he') {
    return `אתה מאמן כושר. בנה לי תוכנית אימון מותאמת למטרה שלי (ציין לו: עלייה במסה, ירידה במשקל, כוח…).

${buildFormatInstructions(locale)}

תרגילים זמינים (${exercises.length}) — פורמט « id | שם | שריר | ציוד | מעקב | מנוחה ברירת מחדל » :
${buildExerciseCatalog(exercises, locale)}`;
  }

  return `Tu es coach sportif. Construis-moi un programme d'entraînement adapté à mon objectif (précise-le lui : prise de masse, perte de poids, force…).

${buildFormatInstructions(locale)}

Exercices disponibles (${exercises.length}) — format « id | nom | muscle | équipement | suivi | repos par défaut » :
${buildExerciseCatalog(exercises, locale)}`;
}

export function trackingLabel(exercise: Exercise): string {
  if (exercise.tracking === 'reps') return 'reps';
  if (exercise.tracking === 'duration') return 'duree';
  return 'distance';
}
