/**
 * The typed API client (DATA_FETCHING_STRATEGY.md §2). Thin `fetch` wrapper — not axios —
 * that attaches the Clerk bearer token, unwraps the `{ data, meta }` success envelope, maps
 * the `{ error }` envelope to AppApiError, and sets the Idempotency-Key on 💳 calls.
 *
 * The token getter is injected by the auth layer (setTokenGetter) so this module has no
 * dependency on Clerk/React and stays trivially testable.
 */
import { env } from '@/lib/env';
import { toAppApiError } from './errors';

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter = async () => null;

/** Called once by the Clerk auth bridge to supply the current access token. */
export function setTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

export interface ApiMeta {
  nextCursor?: string | null;
  [key: string]: unknown;
}

export interface Envelope<T> {
  data: T;
  meta?: ApiMeta;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${env.apiUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Core request → returns the full envelope (use when you need `meta`, e.g. pagination). */
export async function requestWithMeta<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<Envelope<T>> {
  const token = await tokenGetter();
  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: 'omit',
  });

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw toAppApiError(res.status, json);

  // Backend always wraps success as { data, meta? }; tolerate a bare body defensively. Detect the
  // envelope by the PRESENCE of a `data` key, not its truthiness — otherwise a legitimate
  // `{ data: null }` (e.g. "not in this queue") falls through and returns the whole envelope object,
  // which reads as a truthy result with every field undefined.
  const hasEnvelope = typeof json === 'object' && json !== null && 'data' in json;
  const envelope = (json ?? {}) as Partial<Envelope<T>>;
  return { data: (hasEnvelope ? envelope.data : (json as T)) as T, meta: envelope.meta };
}

/** Convenience: unwrap `data` for the common case. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return (await requestWithMeta<T>(path, opts)).data;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  getWithMeta: <T>(path: string, opts?: RequestOptions) =>
    requestWithMeta<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
