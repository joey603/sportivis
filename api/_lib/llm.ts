import { HttpError } from './http.js';
import { requireEnv } from './quota.js';

/**
 * Client LLM via Groq (API compatible OpenAI).
 *
 * Programmes : `qwen/qwen3.6-27b` (remplacement recommandé du Llama 70B).
 * Repas : `openai/gpt-oss-20b` (rapide, JSON stable).
 *
 * On évite `openai/gpt-oss-120b` : plafond TPM free trop juste avec le
 * catalogue d'exercices (413 / content vide / 403 selon le compte).
 */
const DEFAULT_MODEL_PROGRAM = 'qwen/qwen3.6-27b';
const DEFAULT_MODEL_MEAL = 'openai/gpt-oss-20b';
const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [700, 1800];

/** Anciens IDs encore présents dans des `.env` / Vercel → remplacements Groq. */
const MODEL_ALIASES: Record<string, string> = {
  'llama-3.1-8b-instant': DEFAULT_MODEL_MEAL,
  'llama-3.3-70b-versatile': DEFAULT_MODEL_PROGRAM,
  'llama-3.1-70b-versatile': DEFAULT_MODEL_PROGRAM,
  'llama3-70b-8192': DEFAULT_MODEL_PROGRAM,
  'llama3-8b-8192': DEFAULT_MODEL_MEAL,
  'openai/gpt-oss-120b': DEFAULT_MODEL_PROGRAM,
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
  const key = requireEnv('GROQ_API_KEY');
  if (/^(votre_|your_|xxx|changeme|replace)/i.test(key)) {
    throw new HttpError(503, 'server_not_configured');
  }
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
  const apiKey = requireEnv('GROQ_API_KEY');
  if (/^(votre_|your_|xxx|changeme|replace)/i.test(apiKey)) {
    throw new HttpError(503, 'server_not_configured');
  }
  const model = resolveModel(options.purpose);
  // Les modèles Groq en mode `json_object` exigent le mot « JSON » dans le prompt.
  const system = `${options.systemInstruction}\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, respectant exactement cette forme :\n${describeSchema(options.schema)}`;
  const body = buildRequestBody(model, system, options.prompt, options.temperature);

  let lastOverload: HttpError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAYS_MS[attempt - 1]);

    const result = await requestOnce<T>(model, apiKey, body);
    if (result.ok) return result.value;
    if (!result.retryable) throw result.error;
    lastOverload = result.error;
  }

  throw lastOverload ?? new HttpError(503, 'ai_overloaded');
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
  // gpt-oss / qwen3 : limiter le raisonnement pour garder du budget tokens JSON.
  if (model.includes('gpt-oss') || model.includes('qwen3')) {
    payload.reasoning_effort = model.includes('qwen3') ? 'none' : 'low';
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
  | { ok: false; retryable: boolean; error: HttpError };

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
    // 413 = requête trop grosse pour le plafond TPM du modèle (ex. 120b free).
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
    // Clé absente / invalide.
    if (response.status === 401) {
      console.error('[groq]', groqMessage);
      return {
        ok: false,
        retryable: false,
        error: new HttpError(503, 'server_not_configured'),
      };
    }
    // 403 = souvent modèle non autorisé sur ce compte, pas une clé manquante.
    if (response.status === 403) {
      console.error('[groq]', model, groqMessage);
      return {
        ok: false,
        retryable: false,
        error: new HttpError(502, 'ai_unreachable'),
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
    return { ok: false, retryable: false, error: new HttpError(502, 'ai_unreachable') };
  }

  const text = extractJsonText(payload?.choices?.[0]?.message);
  if (!text) {
    return { ok: false, retryable: false, error: new HttpError(502, 'ai_empty') };
  }

  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, retryable: false, error: new HttpError(502, 'ai_invalid_json') };
  }
}

/** Contenu utile : `content` d'abord, sinon JSON extrait du champ reasoning. */
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
