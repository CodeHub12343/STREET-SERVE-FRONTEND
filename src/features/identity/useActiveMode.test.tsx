import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useModeStore } from '@/stores/mode.store';
import { useActiveMode } from './hooks/useActiveMode';

let pathname = '/map';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('useActiveMode', () => {
  beforeEach(() => {
    pathname = '/map';
    useModeStore.setState({ activeMode: 'customer' });
  });

  it('reports the route’s surface even when stored intent says otherwise', () => {
    // The reported bug: last tapped Switch → Consignment Hub, then landed on the customer map.
    useModeStore.setState({ activeMode: 'hub' });
    pathname = '/map';
    const { result } = renderHook(() => useActiveMode());
    expect(result.current).toBe('customer');
  });

  it('writes the route’s surface back, so the stored preference stops lying', async () => {
    useModeStore.setState({ activeMode: 'hub' });
    pathname = '/map';
    renderHook(() => useActiveMode());
    await waitFor(() => expect(useModeStore.getState().activeMode).toBe('customer'));
  });

  it('falls back to stored intent on routes that belong to no surface', () => {
    useModeStore.setState({ activeMode: 'hub' });
    pathname = '/onboarding/role';
    const { result } = renderHook(() => useActiveMode());
    expect(result.current).toBe('hub');
    // …and must not overwrite it with a guess.
    expect(useModeStore.getState().activeMode).toBe('hub');
  });

  it('tracks a move between surfaces', () => {
    pathname = '/hub/settlements';
    const { result, rerender } = renderHook(() => useActiveMode());
    expect(result.current).toBe('hub');
    pathname = '/seller/inventory';
    rerender();
    expect(result.current).toBe('seller');
  });
});
