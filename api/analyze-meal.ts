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

export const config = { maxDuration: 30 };

const MEAL_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
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
  },
  required: ['label', 'items'],
};

type RawMeal = {
  label?: string;
  items?: {
    name?: string;
    quantity?: string;
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
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

    const remaining = await consumeQuota(token, 'meal');

    const raw = await generateJson<RawMeal>({
      systemInstruction:
        locale === 'he'
          ? 'אתה תזונאי מדויק. אתה מעריך ערכים תזונתיים לפי תיאור חופשי בעברית. אתה מקפיד מאוד על כמויות וגדלים (מיני / קטן / גדול / חצי) ולא מחליף אותם במנה סטנדרטית.'
          : "Tu es nutritionniste précis. Tu estimes les valeurs nutritionnelles d'un repas décrit librement, en français. Tu respects scrupuleusement les quantités et tailles (mini / petit / grand / demi) et tu ne les remplaces jamais par une portion standard.",
      prompt: buildPrompt(locale, description),
      schema: MEAL_SCHEMA,
      schemaName: 'meal_analysis',
      purpose: 'meal',
      temperature: 0.1,
    });

    sendJson(res, 200, { meal: normalize(raw, description), remaining });
  } catch (error) {
    sendError(res, error);
  }
}

function buildPrompt(locale: Locale, description: string): string {
  if (locale === 'he') {
    return `נתח את הארוחה הבאה והחזר את הערכים התזונתיים המשוערים שלה.

תיאור הארוחה: « ${description} »

כללים:
- פרק את הארוחה לפריטים נפרדים לפי מה שנאמר בתיאור.
- מוצר מותג אחד (למשל "מיני מילקי ווי") הוא פריט אחד בלבד — אל תפרק אותו למרכיבים (שוקולד / קרמל / נוגט).
- כבד בדיוק את הכמויות והגדלים שצוינו: "מיני", "קטן", "גדול", "חצי", "כפית", "כף", משקל בגרמים וכו'. מיני ≠ רגיל.
- אם הכמות לא צוינה, הנח מנה רגילה וכתוב אותה במפורש ב-"quantity".
- ב-"quantity" כתוב את הגודל שנלקח בחשבון (למשל "1 יחידת מיני (~18 ג')").
- השתמש בערכים מציאותיים לגודל הזה (למשל מיני מילקי ווי ≈ 75–90 קק"ל, לא כמו בר רגיל).
- "kcal" הוא מספר שלם, "proteinG" / "carbsG" / "fatG" בגרמים.
- אל תוסיף פריטים שלא הוזכרו.`;
  }

  return `Analyse le repas suivant et renvoie son estimation nutritionnelle.

Description du repas : « ${description} »

Règles :
- Décompose le repas en aliments distincts selon ce qui est dit.
- Un produit de marque (ex. « mini Milky Way ») = UN seul item : ne le découpe pas en ingrédients (chocolat / caramel / nougat).
- Respecte exactement les quantités et tailles indiquées : « mini », « petit », « grand », « demi », cuillère, grammes, etc. Mini ≠ format classique.
- Si la quantité n'est pas précisée, retiens une portion standard et écris-la clairement dans "quantity".
- Dans "quantity", indique la taille effectivement retenue (ex. « 1 mini (~18 g) »).
- Utilise des calories réalistes pour CETTE taille (ex. un mini Milky Way ≈ 75–90 kcal, pas celles d'une barre normale).
- "kcal" est un entier, "proteinG" / "carbsG" / "fatG" sont en grammes.
- N'ajoute aucun aliment qui n'a pas été mentionné.`;
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

/**
 * Les totaux sont recalculés depuis les aliments : le modèle se trompe plus
 * souvent sur une addition que sur l'estimation d'un aliment isolé.
 */
function normalize(raw: RawMeal, fallbackLabel: string): AnalyzedMeal {
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
