import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Les fonctions Vercel reçoivent les objets Node natifs, éventuellement
 * enrichis d'un corps déjà décodé. Le serveur de développement Vite passe les
 * mêmes objets sans le décoder : les helpers gèrent donc les deux cas.
 */
export type ApiRequest = IncomingMessage & { body?: unknown };
export type ApiResponse = ServerResponse;

const MAX_BODY_BYTES = 64 * 1024;

export async function readJsonBody(req: ApiRequest): Promise<unknown> {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') return safeParse(req.body);
    return req.body;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'body_too_large');
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  return safeParse(Buffer.concat(chunks).toString('utf8'));
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

export function sendJson(
  res: ApiResponse,
  status: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
  }
}

/** Jeton d'accès Supabase transmis par le client. */
export function bearerToken(req: ApiRequest): string {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'missing_token');
  return token;
}

export function requirePost(req: ApiRequest): void {
  if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
}

/** Convertit toute erreur en réponse JSON stable pour le client. */
export function sendError(res: ApiResponse, error: unknown): void {
  if (error instanceof HttpError) {
    sendJson(res, error.status, { error: error.message });
    return;
  }
  console.error('[api]', error);
  sendJson(res, 500, { error: 'server_error' });
}

export function readString(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
  const value = source[key];
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function readInt(
  source: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = Number(source[key]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
