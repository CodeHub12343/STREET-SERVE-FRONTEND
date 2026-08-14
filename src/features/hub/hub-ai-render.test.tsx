import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { HubAiDashboard } from './components/HubAiDashboard';
import type { HubAiDashboardData } from './hooks/useHubAi';
import type { ReallocationAdvice } from '@/features/ai/types';

/**
 * H-06 hub AI dashboard.
 *
 * These exist because of a bug that nothing caught for months: the component's `queryFn` was
 *
 *     isMapDemo ? Promise.resolve(demoHubForecast()) : Promise.resolve(demoHubForecast())
 *
 * — both branches identical — so every hub operator in every environment saw the same three
 * invented products and the same invented instruction to move candle cases to Graceada. It looked
 * completely plausible, which is exactly why nobody noticed.
 *
 * A hub operator physically relocates stock on the strength of this screen. So the properties
 * pinned here are all about the page telling the truth:
 *
 *  1. it renders what the API returned, and nothing the API did not;
 *  2. the sample data cannot reach it;
 *  3. thin evidence produces SILENCE, not a filler recommendation — the backend deliberately
 *     returns `[]` rather than advise a move on one lucky sale, and the UI must honour that;
 *  4. a hub with no stock gets an honest empty state, not zeroes arranged to look like insight;
 *  5. the advisory framing survives, so guidance is not presented as instruction.
 */

const mockDashboard = vi.hoisted(() => vi.fn());
const mockAdvice = vi.hoisted(() => vi.fn());

vi.mock('./hooks/useHubAi', () => ({ useHubAiDashboard: mockDashboard }));
vi.mock('@/features/ai/hooks/useCoach', () => ({ useReallocationAdvice: mockAdvice }));

function wrap(ui: ReactNode) {
  return (
    <ThemeProvider theme={darkTheme}>
      <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>
    </ThemeProvider>
  );
}

const DASHBOARD: HubAiDashboardData = {
  hubId: 'hub1',
  windowDays: 30,
  recentRevenueCents: 42_000,
  recentUnits: 17,
  advisoryOnly: true,
  products: [
    {
      productId: 'p1',
      name: 'Hand-poured Beeswax Candles',
      quantityAvailable: 3,
      recentUnits: 12,
      sellThrough: 0.8,
      suggestion: 'Restock — selling faster than current stock covers.',
    },
    {
      productId: 'p2',
      name: 'Pressed Flower Cards',
      quantityAvailable: 40,
      recentUnits: 0,
      sellThrough: 0,
      suggestion: 'Slow mover — consider promoting or reallocating.',
    },
  ],
};

const ok = (data: HubAiDashboardData) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

afterEach(() => vi.clearAllMocks());

describe('hub AI dashboard — it shows real data or nothing', () => {
  it('renders the products the API returned', () => {
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.getByText('Hand-poured Beeswax Candles')).toBeInTheDocument();
    expect(screen.getByText('Pressed Flower Cards')).toBeInTheDocument();
    // 0.8 → 80%, from the API's own number rather than anything recomputed here.
    expect(screen.getByText(/80% sell-through/)).toBeInTheDocument();
  });

  it('never shows the old hardcoded sample products', () => {
    // The regression guard. If demo data leaks back into the real path, this fails loudly.
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.queryByText(/Soy Candles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Local Honey Jars/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Canvas Tote Bags/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Graceada/i)).not.toBeInTheDocument();
  });

  it('takes the restock badge from the backend suggestion, not a threshold of its own', () => {
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    // Two rules for one thing in two places is how the UI ends up saying "Restock" while the API
    // says "Hold". The badge follows the API.
    expect(screen.getByText('Restock')).toBeInTheDocument();
    expect(screen.getByText('Slow mover')).toBeInTheDocument();
  });
});

describe('hub AI dashboard — silence over filler', () => {
  it('shows NO reallocation card when the backend has no advice', () => {
    /**
     * The backend returns `[]` when evidence is thin, on purpose: advising a move on one lucky sale
     * elsewhere is worse than silence, because the operator drives a van on the strength of it.
     */
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.queryByText(/Reallocation suggestion/i)).not.toBeInTheDocument();
  });

  it('shows the reallocation card WITH its evidence when the backend does advise', () => {
    const advice: ReallocationAdvice[] = [
      {
        category: 'candles',
        hereRate: 0.2,
        bestTile: '-42:13',
        bestRate: 0.75,
        advice: 'Candles sell far better a few blocks east this month.',
      },
    ];
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: advice });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.getByText('Reallocation suggestion')).toBeInTheDocument();
    expect(screen.getByText(/sell far better a few blocks east/)).toBeInTheDocument();
    // The numbers behind the claim, so an operator can judge it rather than just believe it.
    expect(screen.getByText(/20% sell-through here vs 75%/)).toBeInTheDocument();
  });

  it('gives an honest empty state for a hub with no stock', () => {
    mockDashboard.mockReturnValue(ok({ ...DASHBOARD, products: [] }));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.getByText(/No stock to report on yet/i)).toBeInTheDocument();
    // No advisory footer either — there is nothing to be advisory about.
    expect(screen.queryByText(/Guidance only/i)).not.toBeInTheDocument();
  });

  it('refuses to guess when the request fails', () => {
    mockDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.getByText(/couldn’t load your hub figures/i)).toBeInTheDocument();
    expect(screen.queryByText('Hand-poured Beeswax Candles')).not.toBeInTheDocument();
  });
});

describe('hub AI dashboard — framing', () => {
  it('keeps the advisory wording so guidance is not read as instruction', () => {
    mockDashboard.mockReturnValue(ok(DASHBOARD));
    mockAdvice.mockReturnValue({ data: [] });

    render(wrap(<HubAiDashboard hubId="hub1" />));

    expect(screen.getByText(/Guidance only/i)).toBeInTheDocument();
    /**
     * The window is stated, so a percentage is not mistaken for an all-time figure. Asserted with
     * `getAllByText` because it deliberately appears twice — once as the section heading and once
     * in the advisory footer — and an operator should meet it in both places.
     */
    expect(screen.getAllByText(/last 30 days/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Demand · last 30 days/i)).toBeInTheDocument();
  });
});
