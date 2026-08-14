import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffect, useState } from 'react';

/**
 * A promoted ad links to `/business/{id}`, which renders the SAME `MapHome` component that `/map`
 * does — just with `initialBusinessId` set. Because both routes render the same component, React
 * reuses the instance across the navigation and `useState(initialBusinessId)` never re-reads the
 * prop: the URL changed, the profile sheet did not open, and the user landed back on a plain map.
 *
 * This exercises the state rule in isolation rather than mounting the whole map, because the rule
 * is the thing that was wrong and it is what must not regress.
 */
function useSelectedBusiness(initialBusinessId?: string) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialBusinessId);
  useEffect(() => {
    if (initialBusinessId) setSelectedId(initialBusinessId);
  }, [initialBusinessId]);
  return { selectedId, close: () => setSelectedId(undefined) };
}

describe('deep-linking to a business profile over the map', () => {
  it('opens the profile when the route supplies an id on first render', () => {
    const { result } = renderHook(() => useSelectedBusiness('biz_1'));
    expect(result.current.selectedId).toBe('biz_1');
  });

  it('opens the profile when navigating from the plain map to a business', () => {
    // The regression: this is /map (no id) → /business/biz_1 on a REUSED component instance.
    const { result, rerender } = renderHook(({ id }) => useSelectedBusiness(id), {
      initialProps: { id: undefined as string | undefined },
    });
    expect(result.current.selectedId).toBeUndefined();

    rerender({ id: 'biz_1' });
    expect(result.current.selectedId).toBe('biz_1');
  });

  it('follows a move from one business to another', () => {
    const { result, rerender } = renderHook(({ id }) => useSelectedBusiness(id), {
      initialProps: { id: 'biz_1' as string | undefined },
    });
    rerender({ id: 'biz_2' });
    expect(result.current.selectedId).toBe('biz_2');
  });

  it('does not reopen the sheet after the user closes it on the same route', () => {
    // Closing must stick. An effect that re-ran on every render would make the sheet un-closable.
    const { result, rerender } = renderHook(({ id }) => useSelectedBusiness(id), {
      initialProps: { id: 'biz_1' as string | undefined },
    });

    act(() => result.current.close());
    expect(result.current.selectedId).toBeUndefined();

    rerender({ id: 'biz_1' }); // same route, incidental re-render
    expect(result.current.selectedId).toBeUndefined();
  });
});
