import { HttpError } from './http.js';
import { requireGroqApiKey } from './quota.js';

/**
 * Client LLM via Groq (https://api.groq.com).
 *
 * Sur le plan gratuit, Groq renvoie parfois des 401 chat alors que la clé
 * est valide. On reste sur les Llama production, on mémorise le dernier
 * modèle qui a marché (instance Vercel chaude) et on évite un moment ceux
 * qui viennent d’échouer.
 */
const DEFAULT_MODEL_PROGRAM = 'llama-3.3-70b-versatile';
const DEFAULT_MODEL_MEAL = 'llama-3.1-8b-instant';
/** Llama 8B : le plus régulier pour les repas. Les programmes restent en 70B. */
const RELIABLE_MEAL_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
] as const;
const ATTEMPT_TIMEOUT_MS = 14_000;
const RETRY_BUDGET_MS = 55_000;
const AUTH_COOLDOWN_MS = 40_000;
const PAUSE_AFTER_AUTH_MS = 250;
const PAUSE_AFTER_OVERLOAD_MS = 2_000;
const PAUSE_DEFAULT_MS = 600;

/** Anciens IDs / previews → modèles Groq production stables. */
const MODEL_ALIASES: Record<string, string> = {
  'llama-3.1-8b-instant': DEFAULT_MODEL_MEAL,
  'llama-3.3-70b-versatile': DEFAULT_MODEL_PROGRAM,
  'llama-3.1-70b-versatile': DEFAULT_MODEL_PROGRAM,
  'llama3-70b-8192': DEFAULT_MODEL_PROGRAM,
  'llama3-8b-8192': DEFAULT_MODEL_MEAL,
  'openai/gpt-oss-120b': DEFAULT_MODEL_PROGRAM,
  'openai/gpt-oss-20b': DEFAULT_MODEL_MEAL,
  'qwen/qwen3.6-27b': DEFAULT_MODEL_PROGRAM,
  'qwen/qwen3-32b': DEFAULT_MODEL_PROGRAM,
};

export type AiPurpose = 'program' | 'meal';

/** Dernier modèle OK par usage — survit entre requêtes sur la même instance. */
const lastGoodModel: Partial<Record<AiPurpose, string>> = {};
/** Timestamp jusqu’auquel un modèle est considéré « mort » (401/403). */
const modelCooldownUntil = new Map<string, number>();

/** Sous-ensemble JSON Schema accepté par `response_format.json_schema`. */
export type JsonSchema = {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  additionalProperties?: boolean;
};

export function assertLlmConfigured(): void {
  requireGroqApiKey();
}

type GroqMessage = {
  content?: string | null;
  reasoning?: string | null;
};

type GroqResponse = {
  choices?: { message?: GroqMessage }[];
  error?: { message?: string };
};

/**
 * Demande une réponse strictement JSON. Le schéma est imposé via
 * `response_format`, ce qui limite les sorties mal formées.
 */
export async function generateJson<T>(options: {
  systemInstruction: string;
  prompt: string;
  schema: JsonSchema;
  schemaName: string;
  purpose: AiPurpose;
  temperature?: number;
}): Promise<T> {
  const apiKey = requireGroqApiKey();
  // Les modèles Groq en mode `json_object` exigent le mot « JSON » dans le prompt.
  const system = `${options.systemInstruction}\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, respectant exactement cette forme :\n${describeSchema(options.schema)}`;

  let lastError: HttpError | null = null;
  const started = Date.now();
  let tryIndex = 0;

  while (Date.now() - started < RETRY_BUDGET_MS) {
    const models = modelCandidates(options.purpose);
    if (!models.length) break;
    const model = models[tryIndex % models.length];
    const remaining = RETRY_BUDGET_MS - (Date.now() - started);
    if (remaining < 2_000) break;

    const body = buildRequestBody(
      model,
      system,
      options.prompt,
      options.temperature,
    );
    const result = await requestOnce<T>(
      model,
      apiKey,
      body,
      Math.min(ATTEMPT_TIMEOUT_MS, remaining - 500),
    );
    if (result.ok) {
      lastGoodModel[options.purpose] = model;
      modelCooldownUntil.delete(model);
      if (tryIndex > 0) {
        console.info(`[groq] ok via ${model} after ${tryIndex + 1} tries`);
      }
      return result.value;
    }
    lastError = result.error;
    if (!result.retryable && !result.tryNextModel) throw result.error;

    if (result.kind === 'auth') {
      modelCooldownUntil.set(model, Date.now() + AUTH_COOLDOWN_MS);
    }

    tryIndex += 1;
    const pause =
      result.kind === 'auth'
        ? PAUSE_AFTER_AUTH_MS
        : result.kind === 'overload'
          ? PAUSE_AFTER_OVERLOAD_MS
          : PAUSE_DEFAULT_MS;
    const wait = Math.min(pause, RETRY_BUDGET_MS - (Date.now() - started));
    if (wait > 0) await delay(wait);
  }

  throw lastError ?? new HttpError(503, 'ai_overloaded');
}

function modelCandidates(purpose: AiPurpose): string[] {
  const primary = resolveModel(purpose);
  // Programmes : uniquement le 70B, comme avant — pas de bascule vers le 8B.
  if (purpose === 'program') return [primary];

  const preferred = lastGoodModel.meal;
  const now = Date.now();
  const ordered = [preferred, DEFAULT_MODEL_MEAL, ...RELIABLE_MEAL_MODELS, primary].filter(
    (model): model is string => Boolean(model),
  );

  const seen = new Set<string>();
  const ready: string[] = [];
  const cooling: string[] = [];
  for (const model of ordered) {
    if (seen.has(model)) continue;
    seen.add(model);
    const until = modelCooldownUntil.get(model) ?? 0;
    if (until > now) cooling.push(model);
    else ready.push(model);
  }
  return ready.length ? ready.concat(cooling) : cooling;
}

function buildRequestBody(
  model: string,
  system: string,
  prompt: string,
  temperature: number | undefined,
): string {
  const payload: Record<string, unknown> = {
    model,
    temperature: temperature ?? 0.7,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  };
  if (model.includes('qwen3')) {
    payload.reasoning_effort = 'none';
  }
  return JSON.stringify(payload);
}

function resolveModel(purpose: AiPurpose): string {
  const configured =
    purpose === 'meal'
      ? (process.env.GROQ_MODEL_MEAL ?? DEFAULT_MODEL_MEAL)
      : (process.env.GROQ_MODEL_PROGRAM ?? DEFAULT_MODEL_PROGRAM);
  const trimmed = configured.trim();
  return MODEL_ALIASES[trimmed] ?? trimmed;
}

/**
 * Décrit le schéma sous une forme JSON compacte et lisible par le modèle
 * (clé → type), suffisante pour guider le mode `json_object`.
 */
function describeSchema(schema: JsonSchema): string {
  switch (schema.type) {
    case 'object': {
      const entries = Object.entries(schema.properties ?? {}).map(
        ([key, value]) => `"${key}": ${describeSchema(value)}`,
      );
      return `{ ${entries.join(', ')} }`;
    }
    case 'array':
      return `[ ${schema.items ? describeSchema(schema.items) : 'any'} ]`;
    case 'integer':
      return 'number (entier)';
    default:
      return schema.type;
  }
}

type RequestKind = 'auth' | 'overload' | 'other';

type RequestResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      retryable: boolean;
      tryNextModel?: boolean;
      kind?: RequestKind;
      error: HttpError;
    };

async function requestOnce<T>(
  model: string,
  apiKey: string,
  body: string,
  timeoutMs: number,
): Promise<RequestResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(3_000, timeoutMs));

  let response: Response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body,
    });
  } catch (reason) {
    if (reason instanceof Error && reason.name === 'AbortError') {
      return { ok: false, retryable: true, kind: 'other', error: new HttpError(504, 'ai_timeout') };
    }
    return { ok: false, retryable: true, kind: 'other', error: new HttpError(502, 'ai_unreachable') };
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as
    | GroqResponse
    | null;

  if (!response.ok) {
    const groqMessage = payload?.error?.message ?? '';
    if (
      response.status === 429 ||
      response.status === 503 ||
      response.status === 413
    ) {
      console.error(`[groq] ${response.status} ${model}: ${groqMessage || 'overloaded'}`);
      return {
        ok: false,
        retryable: true,
        kind: 'overload',
        error: new HttpError(response.status === 413 ? 429 : response.status, 'ai_overloaded'),
      };
    }
    if (response.status === 401 || response.status === 403) {
      // Même clé OK sur /models : 401 chat souvent transitoire / modèle.
      console.error(`[groq] ${response.status}`, model, groqMessage || '(empty)');
      return {
        ok: false,
        retryable: true,
        tryNextModel: true,
        kind: 'auth',
        error: new HttpError(503, 'ai_unreachable'),
      };
    }
    if (
      response.status === 400 &&
      /model|decommission|not found|does not exist/i.test(groqMessage)
    ) {
      console.error('[groq]', model, groqMessage);
      return {
        ok: false,
        retryable: false,
        tryNextModel: true,
        kind: 'other',
        error: new HttpError(502, 'ai_unreachable'),
      };
    }
    if (response.status === 400) {
      console.error('[groq]', groqMessage);
      return {
        ok: false,
        retryable: false,
        error: new HttpError(502, 'ai_blocked'),
      };
    }
    console.error('[groq]', response.status, groqMessage);
    return {
      ok: false,
      retryable: true,
      tryNextModel: true,
      kind: 'other',
      error: new HttpError(502, 'ai_unreachable'),
    };
  }

  const text = extractJsonText(payload?.choices?.[0]?.message);
  if (!text) {
    return {
      ok: false,
      retryable: true,
      tryNextModel: true,
      kind: 'other',
      error: new HttpError(502, 'ai_empty'),
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      retryable: true,
      tryNextModel: true,
      kind: 'other',
      error: new HttpError(502, 'ai_invalid_json'),
    };
  }
}

function extractJsonText(message: GroqMessage | undefined): string {
  const content = message?.content?.trim() ?? '';
  if (content) return content;
  const reasoning = message?.reasoning?.trim() ?? '';
  if (!reasoning) return '';
  const start = reasoning.indexOf('{');
  const end = reasoning.lastIndexOf('}');
  if (start >= 0 && end > start) return reasoning.slice(start, end + 1);
  return '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
