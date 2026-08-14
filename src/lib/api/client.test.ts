import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { api, setTokenGetter } from './client';

/**
 * Envelope unwrapping. The backend wraps success as { data, meta? }. The trap: a legitimate
 * { data: null } (e.g. "you're not in this queue") must unwrap to null — not to the whole envelope
 * object, which would read as a truthy result with every field undefined and, for the queue screen,
 * suppress the auto-join and render "undefinedth in line".
 */

const fetchMock = vi.fn();

beforeEach(() => {
  setTokenGetter(async () => null);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('api envelope unwrapping', () => {
  it('unwraps { data: null } to null, not to the envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null, meta: {} }));
    await expect(api.get('/queues/business/x/me')).resolves.toBeNull();
  });

  it('unwraps a normal { data: {...} } payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { position: 2 }, meta: {} }));
    await expect(api.get('/queues/business/x/me')).resolves.toEqual({ position: 2 });
  });

  it('unwraps { data: [] } to an empty array (not the envelope)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    await expect(api.get('/things')).resolves.toEqual([]);
  });

  it('unwraps { data: false } to false', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: false }));
    await expect(api.get('/flag')).resolves.toBe(false);
  });

  it('tolerates a bare body with no envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ position: 5 }));
    await expect(api.get('/bare')).resolves.toEqual({ position: 5 });
  });
});
