import {
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib/http.js';
import { requireGroqApiKey } from './_lib/quota.js';

/**
 * Diagnostic public (sans secret) pour vérifier GROQ_API_KEY sur Vercel.
 * Ouvre https://sportivis.vercel.app/api/ai-status
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

  const probe = await probeGroqKey(key);
  sendJson(res, 200, {
    ok: probe.ok,
    groqKeyPresent: true,
    keyPreview: maskKey(key),
    keyLength: key.length,
    looksLikeGroqKey: /^gsk_/i.test(key),
    groqStatus: probe.status,
    groqError: probe.error,
    hint: probe.ok
      ? 'La clé est acceptée par Groq.'
      : 'La clé est présente mais Groq la refuse (401). Recrée une clé sur console.groq.com, colle uniquement gsk_… (sans Bearer ni guillemets), Production cochée, Redeploy.',
  });
}

function maskKey(key: string): string {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function probeGroqKey(
  apiKey: string,
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
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
