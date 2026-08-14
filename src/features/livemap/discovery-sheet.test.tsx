import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClientProvider } from '@tanstack/react-query';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { DiscoverySheet } from './components/DiscoverySheet';
import type { MapPinData } from './types';

const CENTER: [number, number] = [-120.9969, 37.6391];
const PINS: MapPinData[] = [
  // Nearest (sits on center) + live → this is the peek's top result and counts as "serving".
  { sessionId: 's1', businessId: 'b1', name: 'Taco Loco', category: 'food', lngLat: CENTER, status: 'driving', etaMin: 2 },
  // Farther + closed → excluded from the serving count, only visible once expanded.
  { sessionId: 's2', businessId: 'b2', name: 'Bean Bus', category: 'coffee', lngLat: [-121.01, 37.65], status: 'away' },
];

/**
 * The sheet now carries a paid `map_banner` slot (P-18), which queries for a fill — so it needs a
 * query client, exactly as it does in the app. Serving is disabled in these tests: what is asserted
 * here is the ORGANIC sheet, and an ad slot must never change what the organic results say.
 */
function renderSheet(onSelect = vi.fn()) {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>
        <DiscoverySheet
          pins={PINS}
          center={CENTER}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          onSelect={onSelect}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { onSelect };
}

describe('DiscoverySheet', () => {
  it('peeks with the count, serving tally, and the nearest result — but not the rest', () => {
    renderSheet();
    // 2 nearby, 1 serving (the away pin is excluded), nearest business shown as the top result.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 serving now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taco Loco/ })).toBeInTheDocument();
    // The farther/closed business is NOT surfaced at peek — browse before gesture, not a full list.
    expect(screen.queryByText('Bean Bus')).not.toBeInTheDocument();
  });

  it('opens the tapped result (the map answers "which")', async () => {
    const { onSelect } = renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /Taco Loco/ }));
    expect(onSelect).toHaveBeenCalledWith('b1', CENTER);
  });

  it('expanding the grabber reveals the full list', async () => {
    renderSheet();
    // ArrowUp on the grabber lifts peek → half without needing pointer/drag simulation.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Expand nearby list' }), { key: 'ArrowUp' });
    expect(await screen.findByText('Bean Bus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Taco Loco/ })).toBeInTheDocument();
  });
});
