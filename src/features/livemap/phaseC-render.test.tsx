import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { useMapLayersStore } from '@/stores/mapLayers.store';

/**
 * Phase C client surfaces.
 *
 * The map carried one kind of thing and now carries three, so the assertions are about the two
 * questions that creates: can you tell the layers apart, and can you turn them off. Plus the one
 * thing the hub-owner map exists for — surfacing stock nobody can locate.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('C-4 layer control', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => {
    // E-4 added the events layer; it defaults ON, so the control now reads 3 of 4.
    useMapLayersStore.setState({ businesses: true, hubs: true, demand: false, events: true });
  });

  it('is a legend and a filter in one, and explains what demand means', async () => {
    const { MapLayerControl } = await import('./components/MapLayerControl');
    render(
      <Providers>
        <MapLayerControl />
      </Providers>,
    );

    // Collapsed by default — the map is the content, not the chrome.
    const trigger = screen.getByRole('button', { name: /Map layers, 3 of 4 on/ });
    await userEvent.click(trigger);

    expect(screen.getByRole('switch', { name: /Businesses/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Pickup hubs/ })).toBeChecked();
    // Demand defaults OFF — it's a vendor planning tool, not an ambient wash under every map.
    expect(screen.getByRole('switch', { name: /Demand/ })).not.toBeChecked();

    // Each row explains itself, so the panel IS the legend rather than describing one.
    expect(screen.getByText('Where you can collect stock to sell')).toBeInTheDocument();
    expect(screen.getByText('Where people are waving and joining lines')).toBeInTheDocument();
    // E-4's layer, added in Phase E and deferred at C-4 for want of an event entity.
    expect(screen.getByRole('switch', { name: /Events/ })).toBeChecked();
  });

  it('toggles a layer and remembers it in the store', async () => {
    const { MapLayerControl } = await import('./components/MapLayerControl');
    render(
      <Providers>
        <MapLayerControl />
      </Providers>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Map layers/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Demand/ }));

    await waitFor(() => expect(useMapLayersStore.getState().demand).toBe(true));
    expect(screen.getByRole('switch', { name: /Demand/ })).toBeChecked();
  });
});

describe('C-1 hub pin', () => {
  it('leads with the count, and says "empty" rather than showing a zero', async () => {
    const { HubPin } = await import('@/components/map/HubPin');
    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <HubPin name="Tenth Street Gifts" itemCount={12} fromUnitValueCents={400} />
      </ThemeProvider>,
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('from $4')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tenth Street Gifts, consignment hub, 12 items available/ }),
    ).toBeInTheDocument();

    // A zero reads as a loading bug; "Empty" is a fact.
    rerender(
      <ThemeProvider theme={darkTheme}>
        <HubPin name="Riverbank Market" itemCount={0} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

describe('C-5 hub inventory map (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('surfaces stock it cannot locate above the map, not below it', async () => {
    const { HubInventoryMap } = await import('@/features/hub/components/HubInventoryMap');
    render(
      <Providers>
        <HubInventoryMap hubId="hub_demo_gift" />
      </Providers>,
    );

    /**
     * Counts what is ON THE MAP — one live seller and one last-known — so the number agrees with
     * the pins. It used to count live sessions only, which read "0/2 located" beside an empty frame
     * on any screen opened between shifts. The label softens to "last seen" whenever some of those
     * pins are stale, because calling a last-known position "located" overstates it.
     */
    await waitFor(() => expect(screen.getByText('2/3')).toBeInTheDocument());
    expect(screen.getByText('last seen')).toBeInTheDocument();

    /**
     * The reason the screen exists: "we don't know where this is" is the most useful thing a hub
     * owner can be told, so the unlocatable holder is named rather than silently dropped. This is
     * now reserved for sellers we have NEVER had a position for — a different, worse case than
     * someone who is simply off shift.
     */
    expect(screen.getByText('1 not showing a location')).toBeInTheDocument();
    expect(screen.getByText(/Dev P\. · 7 × Art prints/)).toBeInTheDocument();

    // The stale pin is explained rather than left as an unexplained rendering difference.
    expect(
      screen.getByText(/pin shows where the seller was last seen, not where they are now/i),
    ).toBeInTheDocument();

    // And the overdue count is called out on its own.
    expect(screen.getByText('overdue')).toBeInTheDocument();
  });
});
