import type { Locale } from '../src/i18n/messages';
import {
  assertLlmConfigured,
  generateJson,
  type JsonSchema,
} from './_lib/llm.js';
import {
  asRecord,
  bearerToken,
  HttpError,
  readJsonBody,
  readString,
  requirePost,
  sendError,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib/http.js';
import { consumeQuota } from './_lib/quota.js';

export const config = { maxDuration: 60 };

const MEAL_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      description: 'ready si l’analyse est claire, needs_clarification sinon',
    },
    label: {
      type: 'string',
      description: 'Nom court du repas, 40 caractères maximum',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: {
            type: 'string',
            description: 'Quantité estimée, unité comprise (ex. 150 g, 1 bol)',
          },
          kcal: { type: 'integer' },
          proteinG: { type: 'number' },
          carbsG: { type: 'number' },
          fatG: { type: 'number' },
        },
        required: ['name', 'quantity', 'kcal', 'proteinG', 'carbsG', 'fatG'],
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['id', 'prompt', 'options'],
      },
    },
  },
  required: ['status', 'label', 'items', 'questions'],
};

type RawMeal = {
  status?: string;
  label?: string;
  items?: {
    name?: string;
    quantity?: string;
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  }[];
  questions?: {
    id?: string;
    prompt?: string;
    options?: unknown;
  }[];
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    requirePost(req);
    assertLlmConfigured();
    const token = bearerToken(req);
    const body = asRecord(await readJsonBody(req));

    const locale: Locale = body.locale === 'he' ? 'he' : 'fr';
    const description = readString(body, 'description', 600);
    if (description.length < 3) throw new HttpError(400, 'description_required');
    const clarifications = readClarifications(body.clarifications);
    const assumeTypical = body.assumeTypical === true;

    const remaining = await consumeQuota(token, 'meal');

    const raw = await generateJson<RawMeal>({
      systemInstruction:
        locale === 'he'
          ? assumeTypical
            ? 'אתה תזונאי. אתה מפרק ארוחות לפריטים נפרדים ומעריך ערכים לפי מנה רגילה/טיפוסית. אל תשאל שאלות — תמיד החזר status = "ready".'
            : 'אתה תזונאי מדויק. אתה מפרק ארוחות לפריטים נפרדים ומעריך ערכים. כשיש אי-בהירות אתה שואל שאלות קצרות AND תמיד ממלא גם אומדן מנה רגילה ב-items כדי שהמשתמש יוכל לקבל בלי לענות.'
          : assumeTypical
            ? 'Tu es nutritionniste. Tu décomposes un repas en aliments DISTINCTS et tu estimes les macros avec des portions normales / typiques. Ne pose aucune question — renvoie toujours status = "ready".'
            : "Tu es nutritionniste précis. Tu décomposes un repas en aliments DISTINCTS et tu estimes les macros. En cas d'ambiguïté tu poses des questions courtes ET tu fournis TOUJOURS une estimation items à portions normales, pour que l'utilisateur puisse accepter sans répondre.",
      prompt: buildPrompt(locale, description, clarifications, assumeTypical),
      schema: MEAL_SCHEMA,
      schemaName: 'meal_analysis',
      purpose: 'meal',
      temperature: 0.1,
    });

    const status =
      assumeTypical
        ? 'ready'
        : raw.status === 'needs_clarification'
          ? 'needs_clarification'
          : 'ready';
    const questions = assumeTypical ? [] : normalizeQuestions(raw.questions);
    const meal = normalizeMeal(raw, description);

    // Précisions optionnelles : on renvoie aussi l’estimation (portions normales).
    if (status === 'needs_clarification' && questions.length > 0 && !clarifications) {
      sendJson(res, 200, {
        status: 'needs_clarification',
        questions,
        meal: meal.items.length > 0 ? meal : undefined,
        remaining,
      });
      return;
    }

    sendJson(res, 200, {
      status: 'ready',
      meal,
      remaining,
    });
  } catch (error) {
    sendError(res, error);
  }
}

function readClarifications(value: unknown): string {
  if (typeof value === 'string') return value.trim().slice(0, 800);
  if (!Array.isArray(value)) return '';
  const lines: string[] = [];
  for (const entry of value.slice(0, 6)) {
    const record = asRecord(entry);
    const prompt = readString(record, 'prompt', 160);
    const answer = readString(record, 'answer', 160);
    if (!answer) continue;
    lines.push(prompt ? `${prompt} → ${answer}` : answer);
  }
  return lines.join('\n').slice(0, 800);
}

function buildPrompt(
  locale: Locale,
  description: string,
  clarifications: string,
  assumeTypical: boolean,
): string {
  const clarificationBlock = clarifications
    ? locale === 'he'
      ? `\nתשובות המשתמש לשאלות הבהרה:\n${clarifications}\n`
      : `\nRéponses de l'utilisateur aux questions de clarification :\n${clarifications}\n`
    : '';

  if (locale === 'he') {
    if (assumeTypical) {
      return `נתח את הארוחה הבאה ללא שאלות הבהרה.

תיאור הארוחה: « ${description} »
${clarificationBlock}
המשתמש בחר « הוסף בלי דיוק »: עליך להעריך מנה רגילה/טיפוסית של כל מזון.

כללי פירוק (קריטיים):
- כל מזון שמוזכר הוא פריט נפרד, אלא אם המשתמש אמר במפורש מנה מורכבת אחת.
- « ביצים ועוף וסלט » = 3 פריטים נפרדים. לעולם אל תמזג.
- מוצר מותג אחד = פריט אחד.
- אל תוסיף מזונות שלא הוזכרו.

חובה:
- status = "ready" תמיד (אסור "needs_clarification").
- "questions" = [].
- מלא "items" עם name / quantity / kcal / proteinG / carbsG / fatG.
- ב-"quantity" כתוב במפורש את ההנחה (למשל « מנה רגילה ~150 ג׳ », « 2 ביצים גדולות »).`;
    }

    return `נתח את הארוחה הבאה.

תיאור הארוחה: « ${description} »
${clarificationBlock}
כללי פירוק (קריטיים):
- כל מזון שמוזכר הוא פריט נפרד, אלא אם המשתמש אמר במפורש מנה מורכבת אחת (« חביתת עוף », « סלט עוף »).
- « ביצים ועוף וסלט » = 3 פריטים נפרדים. לעולם אל תמזג ל« ביצי עוף ».
- מוצר מותג אחד (למשל "מיני מילקי ווי") הוא פריט אחד — אל תפרק למרכיבים.
- אל תוסיף מזונות שלא הוזכרו.

מתי להחזיר status = "needs_clarification":
- חסרות כמויות לרוב הפריטים, או
- שתי חלבונים / בשרים זה לצד זה בלי להבהיר אם הם נפרדים או מנה אחת, או
- ניסוח דו-משמעי שיכול להתפרש כמנה מורכבת.
אז:
1) מלא "questions" ב-1 עד 3 שאלות קצרות, כל אחת עם 2–4 "options" ברורות.
2) וגם מלא "label" + "items" עם אומדן מנה רגילה/טיפוסית (המשתמש יכול לקבל בלי לענות). ב-"quantity" כתוב את ההנחה במפורש.
אם כבר יש תשובות הבהרה למעלה, אל תשאל שוב: החזר status = "ready" עם הפירוק.

כש-status = "ready":
- מלא "items" עם name / quantity / kcal / proteinG / carbsG / fatG.
- כבד כמויות וגדלים (« מיני », « קטן », גרמים…). אם לא צוין, הנח מנה רגילה וכתוב אותה ב-"quantity".
- "questions" חייב להיות מערך ריק [].`;
  }

  if (assumeTypical) {
    return `Analyse le repas suivant SANS poser de questions.

Description du repas : « ${description} »
${clarificationBlock}
L'utilisateur a choisi « Ajoute sans précision » : tu dois estimer une portion normale / typique pour chaque aliment.

Règles de décomposition (critiques) :
- Chaque aliment mentionné = un item SÉPARÉ, sauf plat composé clairement décrit.
- « œufs, poulet et salade » = 3 items distincts. Ne fusionne JAMAIS.
- Un produit de marque = UN item.
- N'ajoute aucun aliment non mentionné.

Obligatoire :
- status = "ready" toujours (interdit "needs_clarification") ;
- "questions" = [] ;
- remplis "items" (name / quantity / kcal / proteinG / carbsG / fatG) ;
- dans "quantity", écris explicitement l'hypothèse (ex. « portion normale ~150 g », « 2 œufs moyens »).`;
  }

  return `Analyse le repas suivant.

Description du repas : « ${description} »
${clarificationBlock}
Règles de décomposition (critiques) :
- Chaque aliment mentionné = un item SÉPARÉ, sauf si l'utilisateur décrit clairement UN plat composé (« omelette au poulet », « salade de poulet »).
- « œufs, poulet et salade » ou « des œufs du poulet et une salade » = 3 items distincts. Ne fusionne JAMAIS en « œufs au poulet ».
- Un produit de marque (ex. « mini Milky Way ») = UN item, ne le découpe pas en ingrédients.
- N'ajoute aucun aliment non mentionné.

Quand renvoyer status = "needs_clarification" :
- quantités absentes pour la plupart des aliments, OU
- deux protéines / viandes côte à côte sans préciser si séparées ou en un seul plat, OU
- formulation ambiguë qui pourrait être un plat composé.
Alors :
1) remplis "questions" avec 1 à 3 questions courtes, chacune avec 2 à 4 "options" claires ;
2) ET remplis aussi "label" + "items" avec une estimation à portions normales / typiques (l'utilisateur peut accepter sans répondre). Dans "quantity", écris l'hypothèse explicitement.
Si des réponses de clarification sont déjà fournies ci-dessus, ne re-pose pas de questions : renvoie status = "ready" avec la décomposition.

Quand status = "ready" :
- remplis "items" (name / quantity / kcal / proteinG / carbsG / fatG) ;
- respecte les tailles (« mini », « petit », grammes…). Si absente, portion standard explicite dans "quantity" ;
- "questions" doit être un tableau vide [].`;
}

export type AnalyzedMeal = {
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: {
    name: string;
    quantity: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }[];
};

export type ClarifyingQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

function normalizeQuestions(
  raw: RawMeal['questions'],
): ClarifyingQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: ClarifyingQuestion[] = [];
  for (const [index, entry] of raw.slice(0, 3).entries()) {
    const prompt = String(entry?.prompt ?? '').trim().slice(0, 160);
    if (!prompt) continue;
    const options = Array.isArray(entry?.options)
      ? entry.options
          .filter((option): option is string => typeof option === 'string')
          .map((option) => option.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    if (options.length < 2) continue;
    questions.push({
      id: String(entry?.id ?? `q${index + 1}`)
        .trim()
        .slice(0, 32) || `q${index + 1}`,
      prompt,
      options,
    });
  }
  return questions;
}

/**
 * Les totaux sont recalculés depuis les aliments : le modèle se trompe plus
 * souvent sur une addition que sur l'estimation d'un aliment isolé.
 */
function normalizeMeal(raw: RawMeal, fallbackLabel: string): AnalyzedMeal {
  const items = (raw.items ?? [])
    .slice(0, 20)
    .map((item) => ({
      name: String(item.name ?? '').trim().slice(0, 80) || '—',
      quantity: String(item.quantity ?? '').trim().slice(0, 40),
      kcal: clamp(item.kcal, 0, 5000),
      proteinG: clamp(item.proteinG, 0, 500),
      carbsG: clamp(item.carbsG, 0, 1000),
      fatG: clamp(item.fatG, 0, 500),
    }))
    .filter((item) => item.name !== '—' || item.kcal > 0);

  const label =
    String(raw.label ?? '').trim().slice(0, 60) ||
    fallbackLabel.slice(0, 60);

  return {
    label,
    kcal: Math.round(sum(items.map((item) => item.kcal))),
    proteinG: round1(sum(items.map((item) => item.proteinG))),
    carbsG: round1(sum(items.map((item) => item.carbsG))),
    fatG: round1(sum(items.map((item) => item.fatG))),
    items,
  };
}

function clamp(value: unknown, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(max, Math.max(min, Math.round(number * 10) / 10));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
