import { HttpError } from './http.js';
import { requireGroqApiKey } from './quota.js';

/**
 * Client LLM via Groq (https://api.groq.com) — on n’a jamais quitté Groq.
 *
 * Seuls les *modèles* changent : certains IDs Groq (Qwen preview, gpt-oss…)
 * renvoient des 401 « Invalid API Key » intermittents alors que la clé
 * fonctionne sur /models et sur d’autres modèles. On reste sur Llama production.
 */
const DEFAULT_MODEL_PROGRAM = 'llama-3.3-70b-versatile';
const DEFAULT_MODEL_MEAL = 'llama-3.1-8b-instant';
/** Secours : toujours des modèles Groq production. */
const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
] as const;
const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAYS_MS = [500, 1200];

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
  const models = modelCandidates(options.purpose);
  // Les modèles Groq en mode `json_object` exigent le mot « JSON » dans le prompt.
  const system = `${options.systemInstruction}\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, respectant exactement cette forme :\n${describeSchema(options.schema)}`;

  let lastError: HttpError | null = null;

  // Deux tours de la chaîne de modèles : les 401 Groq sont souvent transitoires.
  for (let round = 0; round < 2; round++) {
    if (round > 0) await delay(RETRY_DELAYS_MS[1] ?? 1200);

    for (const model of models) {
      const body = buildRequestBody(
        model,
        system,
        options.prompt,
        options.temperature,
      );
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await delay(RETRY_DELAYS_MS[0] ?? 500);

        const result = await requestOnce<T>(model, apiKey, body);
        if (result.ok) {
          if (round > 0 || model !== models[0]) {
            console.info(`[groq] ok via ${model} (round ${round + 1})`);
          }
          return result.value;
        }
        lastError = result.error;
        if (result.tryNextModel) break;
        if (result.retryable) continue;
        throw result.error;
      }
    }
  }

  throw lastError ?? new HttpError(503, 'ai_overloaded');
}

function modelCandidates(purpose: AiPurpose): string[] {
  const primary = resolveModel(purpose);
  const ordered = [primary, ...FALLBACK_MODELS];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const model of ordered) {
    if (seen.has(model)) continue;
    seen.add(model);
    unique.push(model);
  }
  return unique;
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

type RequestResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      retryable: boolean;
      tryNextModel?: boolean;
      error: HttpError;
    };

async function requestOnce<T>(
  model: string,
  apiKey: string,
  body: string,
): Promise<RequestResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
      return { ok: false, retryable: false, error: new HttpError(504, 'ai_timeout') };
    }
    return { ok: false, retryable: true, error: new HttpError(502, 'ai_unreachable') };
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
        error: new HttpError(response.status === 413 ? 429 : response.status, 'ai_overloaded'),
      };
    }
    if (response.status === 401 || response.status === 403) {
      // Même clé OK sur /models : 401 chat souvent transitoire / modèle.
      console.error(`[groq] ${response.status}`, model, groqMessage || '(empty)');
      return {
        ok: false,
        retryable: true,
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
      error: new HttpError(502, 'ai_unreachable'),
    };
  }

  const text = extractJsonText(payload?.choices?.[0]?.message);
  if (!text) {
    return {
      ok: false,
      retryable: true,
      tryNextModel: true,
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
