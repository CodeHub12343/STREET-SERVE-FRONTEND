import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { CrewMember, Expense, ExpenseSummary, Invoice } from './types';

/**
 * 7.6 / 7.10 — the vendor's flash sales and back office.
 *
 * Three of these tests exist because of ADR-002 and one because of A-7, and all four are about what
 * the screen SAYS rather than what it renders:
 *
 *  1. The back office never calls a crew member an employee, or a rate a wage. Those words are read
 *     as claims about a legal relationship, and the platform must not make them for a sole trader.
 *  2. A crew is framed as mutual and non-binding, at the top, before anyone is invited.
 *  3. An expense summary states what it is NOT — the platform sees only platform money.
 *  4. A flash sale says discounts do not stack, before the vendor starts one.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mocks = vi.hoisted(() => ({
  crew: [] as CrewMember[],
  expenses: [] as Expense[],
  invoices: [] as Invoice[],
  summary: null as ExpenseSummary | null,
  sales: [] as unknown[],
}));

vi.mock('./hooks/useBackoffice', () => ({
  useCrew: () => ({ data: mocks.crew, isLoading: false }),
  useExpenses: () => ({ data: mocks.expenses, isLoading: false }),
  useInvoices: () => ({ data: mocks.invoices, isLoading: false }),
  useExpenseSummary: () => ({ data: mocks.summary, isLoading: false }),
  useAddExpense: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateInvoice: () => ({ mutate: vi.fn(), isPending: false }),
  useSetInvoiceStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useAllFlashSales: () => ({ data: mocks.sales, isLoading: false }),
  useCreateFlashSale: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelFlashSale: () => ({ mutate: vi.fn(), isPending: false }),
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

afterEach(() => {
  mocks.crew = [];
  mocks.expenses = [];
  mocks.invoices = [];
  mocks.summary = null;
  mocks.sales = [];
  vi.clearAllMocks();
});

async function renderBackOffice() {
  const { BackOffice } = await import('./components/BackOffice');
  render(
    <Providers>
      <BackOffice businessId="biz1" />
    </Providers>,
  );
  await waitFor(() => expect(screen.getByText('Back office')).toBeInTheDocument());
}

describe('back office (7.10 / ADR-002)', () => {
  it('never uses employment language anywhere on the screen', async () => {
    // The copy rule, checked at the surface a regulator would actually look at.
    mocks.crew = [
      {
        id: 'c1',
        businessId: 'biz1',
        userId: 'u1',
        note: 'Saturday market',
        defaultRateCents: 15000,
        status: 'active',
      },
    ];
    await renderBackOffice();
    await userEvent.click(screen.getByRole('tab', { name: /crew/i }));

    const text = document.body.textContent ?? '';
    for (const word of ['employee', 'employees', 'payroll', 'salary', 'wage', 'wages', 'staff']) {
      expect(text.toLowerCase(), `found "${word}" in the back office`).not.toMatch(
        new RegExp(`\\b${word}\\b`),
      );
    }
  });

  it('frames a crew as mutual and non-binding, before anyone is invited', async () => {
    await renderBackOffice();
    await userEvent.click(screen.getByRole('tab', { name: /crew/i }));
    expect(screen.getByText(/it is not employment/i)).toBeInTheDocument();
    expect(screen.getByText(/nobody on it owes you hours/i)).toBeInTheDocument();
  });

  it('states what the expense summary is NOT, alongside the total', async () => {
    // Revenue here is only platform money. A platform-computed "profit" would be wrong in the
    // direction that matters and would look authoritative while being so.
    mocks.summary = {
      from: new Date().toISOString(),
      to: new Date().toISOString(),
      byCategory: { fuel: 4500 },
      totalCents: 4500,
      count: 1,
      withReceipt: 0,
      disclosure:
        'These are the expenses you recorded here. They are not a complete picture of your business.',
    };
    await renderBackOffice();
    expect(screen.getByText(/not a complete picture/i)).toBeInTheDocument();
  });

  it('says the platform did not process an invoice payment', async () => {
    // "Mark as paid" reads like the platform collected the money, and it did not.
    mocks.invoices = [
      {
        id: 'i1',
        number: 'INV-0001',
        customerName: 'A Customer',
        customerEmail: null,
        lineItems: [{ description: 'Catering', quantity: 1, unitPriceCents: 25000 }],
        subtotalCents: 25000,
        taxCents: 0,
        totalCents: 25000,
        status: 'sent',
        issuedOn: new Date().toISOString(),
        dueOn: null,
        paidAt: null,
        notes: null,
        disclosure:
          'Marking this paid records what you tell us. StreetServe did not process this payment.',
      },
    ];
    await renderBackOffice();
    await userEvent.click(screen.getByRole('tab', { name: /invoices/i }));
    expect(screen.getByText(/did not process this payment/i)).toBeInTheDocument();
  });
});

describe('flash sales (7.6)', () => {
  async function renderManager() {
    const { FlashSaleManager } = await import('./components/FlashSaleManager');
    render(
      <Providers>
        <FlashSaleManager businessId="biz1" />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('Flash sales')).toBeInTheDocument());
  }

  it('says discounts do not stack, before the vendor starts one', async () => {
    // The thing a vendor would not guess and would be upset to discover from a receipt.
    await renderManager();
    expect(screen.getByText(/don’t stack/i)).toBeInTheDocument();
    expect(screen.getByText(/whichever is bigger/i)).toBeInTheDocument();
  });

  it('states the maximum duration up front, with what to do instead', async () => {
    // Learning a limit from an error message is how a vendor concludes the feature is broken.
    await renderManager();
    expect(screen.getByText(/Up to 14 days/i)).toBeInTheDocument();
    expect(screen.getByText(/change your prices instead/i)).toBeInTheDocument();
  });
});
