import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { keys } from '@/lib/query/keys';
import type { WaveDown } from './types';

/**
 * The customer's wave tracker sat on "waiting" forever after the vendor accepted, because useWave
 * read a static cache instead of the real GET /wave-downs/:id. These prove it now reflects the
 * server status (mapping `pending`→`waiting`) and keeps the business name across polls.
 */

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/env', () => ({ isMapDemo: false }));
vi.mock('@/lib/api/client', () => ({ api: { get, post: vi.fn(), del: vi.fn() } }));

import { useWave } from './hooks/useWave';

let qc: QueryClient;
function wrapper() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

beforeEach(() => vi.clearAllMocks());

describe('customer wave tracker', () => {
  it('reflects the vendor accepting — not a frozen "waiting"', async () => {
    // The tracker was opened with a seeded wave (businessName known), then the vendor accepts.
    const seeded: WaveDown = {
      id: 'w1',
      businessId: 'biz_1',
      businessName: 'Santiago Furniture Hub',
      status: 'waiting',
      slaDeadline: '2026-07-17T18:00:00Z',
    };
    const w = wrapper();
    qc.setQueryData(keys.wave('w1'), seeded);
    get.mockResolvedValue({
      id: 'w1',
      targetId: 'biz_1',
      targetName: 'Santiago Furniture Hub',
      status: 'accepted',
      expiresAt: '2026-07-17T18:00:00Z',
      etaSeconds: 120,
    });

    const { result } = renderHook(() => useWave('w1'), { wrapper: w });

    await waitFor(() => expect(result.current.data?.status).toBe('accepted'));
    expect(get).toHaveBeenCalledWith('/wave-downs/w1');
    expect(result.current.data?.etaSeconds).toBe(120);
    // The display name from the seed survives the merge.
    expect(result.current.data?.businessName).toBe('Santiago Furniture Hub');
  });

  it("maps the server's 'pending' onto the UI's 'waiting'", async () => {
    get.mockResolvedValue({
      id: 'w2',
      targetId: 'biz_2',
      targetName: 'Taco Loco',
      status: 'pending',
      expiresAt: '2026-07-17T18:00:00Z',
      etaSeconds: null,
    });

    const { result } = renderHook(() => useWave('w2'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.status).toBe('waiting');
    // Cold load (no seed): the name comes from the server so the screen isn't blank.
    expect(result.current.data?.businessName).toBe('Taco Loco');
  });
});
