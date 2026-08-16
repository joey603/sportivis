import {
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib/http.js';
import { requireGroqApiKey } from './_lib/quota.js';

/**
 * Diagnostic public (sans secret) pour vérifier GROQ_API_KEY sur Vercel.
 * Ouvre https://sportivis.vercel.app/api/ai-status
 *
 * Sonde `/models` puis un mini `chat/completions` (même chemin que l’IA),
 * car un 401 intermittent venait parfois du chat alors que `/models` passait.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  let key: string | null = null;
  let keyError: string | null = null;
  try {
    key = requireGroqApiKey();
  } catch (reason) {
    keyError =
      reason instanceof Error ? reason.message : 'missing_groq_key';
  }

  if (!key) {
    sendJson(res, 200, {
      ok: false,
      groqKeyPresent: false,
      reason: keyError ?? 'missing_groq_key',
      hint: 'Ajoute GROQ_API_KEY dans Vercel → Settings → Environment Variables (Production), puis Redeploy.',
    });
    return;
  }

  const modelsProbe = await probeGroqModels(key);
  const mealModel = resolveConfiguredModel('meal');
  const programModel = resolveConfiguredModel('program');
  const mealChat = await probeGroqChat(key, mealModel);
  const programChat = await probeGroqChat(key, programModel);

  const ok = modelsProbe.ok && mealChat.ok && programChat.ok;
  sendJson(res, 200, {
    ok,
    groqKeyPresent: true,
    keyPreview: maskKey(key),
    keyLength: key.length,
    looksLikeGroqKey: /^gsk_/i.test(key),
    groqStatus: modelsProbe.status,
    groqError: modelsProbe.error,
    models: {
      meal: mealModel,
      program: programModel,
    },
    chat: {
      meal: mealChat,
      program: programChat,
    },
    hint: hintFor(ok, modelsProbe, mealChat, programChat),
  });
}

function hintFor(
  ok: boolean,
  models: ProbeResult,
  meal: ProbeResult,
  program: ProbeResult,
): string {
  if (ok) return 'La clé est acceptée par Groq (models + chat).';
  if (!models.ok) {
    return 'La clé est présente mais Groq la refuse sur /models (401). Recrée une clé sur console.groq.com, colle uniquement gsk_… (sans Bearer ni guillemets), Production cochée, Redeploy.';
  }
  const failed = [meal, program].find((probe) => !probe.ok);
  if (failed?.status === 401) {
    return 'Clé OK sur /models mais chat renvoie 401 (souvent transitoire). Réessaie ; si ça dure, vérifie le modèle ou recrée la clé.';
  }
  return `Chat Groq en échec (${failed?.status ?? '?'}): ${failed?.error ?? 'inconnu'}. Réessaie dans une minute.`;
}

function maskKey(key: string): string {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

type ProbeResult = {
  ok: boolean;
  status: number | null;
  error: string | null;
};

async function probeGroqModels(apiKey: string): Promise<ProbeResult> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });
    if (response.ok) {
      return { ok: true, status: response.status, error: null };
    }
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      ok: false,
      status: response.status,
      error: payload?.error?.message ?? `HTTP ${response.status}`,
    };
  } catch (reason) {
    return {
      ok: false,
      status: null,
      error: reason instanceof Error ? reason.message : 'network_error',
    };
  }
}

/** Mini complétion : même endpoint auth que generate-program / analyze-meal. */
async function probeGroqChat(
  apiKey: string,
  model: string,
): Promise<ProbeResult & { model: string }> {
  try {
    const payload: Record<string, unknown> = {
      model,
      temperature: 0,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with OK' }],
    };
    if (model.includes('qwen3')) {
      payload.reasoning_effort = 'none';
    }
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
    );
    if (response.ok) {
      return { ok: true, status: response.status, error: null, model };
    }
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      ok: false,
      status: response.status,
      error: body?.error?.message ?? `HTTP ${response.status}`,
      model,
    };
  } catch (reason) {
    return {
      ok: false,
      status: null,
      error: reason instanceof Error ? reason.message : 'network_error',
      model,
    };
  }
}

function resolveConfiguredModel(purpose: 'meal' | 'program'): string {
  const defaults = {
    meal: 'openai/gpt-oss-20b',
    program: 'qwen/qwen3.6-27b',
  } as const;
  const aliases: Record<string, string> = {
    'llama-3.1-8b-instant': defaults.meal,
    'llama-3.3-70b-versatile': defaults.program,
    'llama-3.1-70b-versatile': defaults.program,
    'llama3-70b-8192': defaults.program,
    'llama3-8b-8192': defaults.meal,
    'openai/gpt-oss-120b': defaults.program,
  };
  const configured =
    purpose === 'meal'
      ? (process.env.GROQ_MODEL_MEAL ?? defaults.meal)
      : (process.env.GROQ_MODEL_PROGRAM ?? defaults.program);
  const trimmed = configured.trim();
  return aliases[trimmed] ?? trimmed;
}
