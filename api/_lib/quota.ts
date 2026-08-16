import { HttpError } from './http.js';

/**
 * Le plafond journalier vit dans Postgres (fonction `consume_ai_quota`) : le
 * jeton de l'utilisateur est simplement relayé, donc c'est la base qui
 * authentifie l'appelant et décrémente son solde de façon atomique.
 */
export async function consumeQuota(
  token: string,
  feature: 'program' | 'meal',
): Promise<number> {
  const url = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

  const response = await fetch(`${url}/rest/v1/rpc/consume_ai_quota`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_feature: feature }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(401, 'invalid_token');
  }

  const payload = (await response.json().catch(() => null)) as
    | number
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' ? (payload.message ?? '') : '';
    if (message.includes('quota_exceeded')) {
      throw new HttpError(429, 'quota_exceeded');
    }
    if (message.includes('not_authenticated')) {
      throw new HttpError(401, 'invalid_token');
    }
    if (message.includes('consume_ai_quota')) {
      throw new HttpError(503, 'migration_missing');
    }
    throw new HttpError(502, 'quota_unavailable');
  }

  return typeof payload === 'number' ? payload : 0;
}

export function requireEnv(name: string, fallbackName?: string): string {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) throw new HttpError(503, 'server_not_configured');
  return value;
}
