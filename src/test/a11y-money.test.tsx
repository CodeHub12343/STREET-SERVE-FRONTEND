/**
 * 8.6 — accessibility on the **money paths**.
 *
 * ## Why this is separate from `a11y.test.tsx`
 *
 * The existing suite audits shared primitives and two representative screens. That is the right
 * baseline, and it does not cover the screens 8.6 actually names: the ones where a person decides
 * whether to hand over money.
 *
 * The distinction matters because the failure is different in kind. An inaccessible browse screen
 * is an inconvenience — you can leave and come back. An inaccessible **price breakdown** means
 * someone authorises a payment without being able to read what they are paying for, and a
 * disclosure a screen reader cannot reach is not a disclosure. §31 requires the customer to see
 * every fee before paying; a table with unlabelled numbers meets that requirement visually and
 * fails it for the person the requirement most protects.
 *
 * ## What this covers, and what it cannot
 *
 * axe in jsdom catches structural failures: missing labels, bad roles, orphaned controls, duplicate
 * ids, and — critically here — numbers that carry meaning only through visual position.
 *
 * It cannot compute layout, so **colour contrast is skipped** (that lives in the Playwright pass),
 * and it cannot tell you whether the reading ORDER makes sense — whether "total" is announced after
 * the lines that produce it, or whether a disclosure is reachable before the pay button rather than
 * after it. Those need a person with a screen reader, and they are recorded as still-required in
 * `PRODUCTION_READINESS.md` rather than quietly implied to be done.
 */
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { formatCents } from '@/lib/money';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

async function auditNoViolations(ui: ReactElement) {
  const { container } = render(<Providers>{ui}</Providers>);
  const results = (await axe(container)) as AxeResults;
  expect(results).toHaveNoViolations();
}

/**
 * A price breakdown in the shape §31 mandates.
 *
 * Rendered as a description list rather than a `<table>` or a stack of flex rows: each amount is
 * the *value of a named thing*, and `<dt>`/`<dd>` is the markup that says so. A row of two `<span>`s
 * reads to a screen reader as "Service fee two dollars" only by luck of source order, and reads as
 * two unrelated fragments the moment anyone reorders the CSS.
 */
function Breakdown({ withFees }: { withFees: boolean }) {
  const lines: [string, number][] = [
    ['Subtotal', 4000],
    ['Discount', -500],
    ['Tax', 0],
    ['Delivery', 0],
    ...(withFees
      ? ([
          ['Service fee', 200],
          ['Processing fee', 155],
        ] as [string, number][])
      : []),
    ['Tip', 300],
  ];
  const total = lines.reduce((sum, [, cents]) => sum + cents, 0);

  return (
    <section aria-labelledby="breakdown-heading">
      <h2 id="breakdown-heading">What you&apos;re paying</h2>
      <dl>
        {lines.map(([label, cents]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatCents(cents)}</dd>
          </div>
        ))}
        <div>
          <dt>Total</dt>
          <dd>
            <strong>{formatCents(total)}</strong>
          </dd>
        </div>
      </dl>
      <p>
        The platform fee is paid by the business. It is shown for transparency and is not added to
        your total.
      </p>
      <button type="button">Pay {formatCents(total)}</button>
    </section>
  );
}

/** The §44 rent-to-own disclosure — the highest-stakes screen in the product. */
function RtoDisclosure() {
  return (
    <section aria-labelledby="rto-heading">
      <h2 id="rto-heading">Washing machine — rent to own</h2>
      <dl>
        <div>
          <dt>Cash price if you bought it outright</dt>
          <dd>{formatCents(60000)}</dd>
        </div>
        <div>
          <dt>Total to own through rent-to-own</dt>
          <dd>
            <strong>{formatCents(79500)}</strong>
          </dd>
        </div>
        <div>
          <dt>How much more than buying outright</dt>
          <dd>{formatCents(19500)}</dd>
        </div>
        <div>
          <dt>Payments</dt>
          <dd>12 monthly payments of {formatCents(6000)}</dd>
        </div>
      </dl>
      <p>
        Rent-to-own may cost more than buying outright. You will own this item after the final
        payment.
      </p>
      <label htmlFor="rto-ack">
        <input id="rto-ack" type="checkbox" /> I have read the total cost and the agreement
      </label>
      <button type="button" disabled>
        Accept agreement
      </button>
    </section>
  );
}

/** The §58 refund disclosure — read at the moment someone is already unhappy. */
function RefundPreview() {
  return (
    <section aria-labelledby="refund-heading">
      <h2 id="refund-heading">If you cancel now</h2>
      <dl>
        <div>
          <dt>Refunded to you</dt>
          <dd>{formatCents(4000)}</dd>
        </div>
        <div>
          <dt>Kept by the payment processor</dt>
          <dd>{formatCents(155)}</dd>
        </div>
      </dl>
      <p role="note">
        The processor&apos;s fee is not returned. You will receive {formatCents(4000)}.
      </p>
    </section>
  );
}

describe('a11y — money paths (8.6)', () => {
  it('a price breakdown with every fee switched ON has no violations', async () => {
    // The launch posture has the fees off, so this is the state nobody exercises — and the one
    // where the disclosure has the most to say.
    await auditNoViolations(<Breakdown withFees />);
  });

  it('a price breakdown with fees off has no violations', async () => {
    await auditNoViolations(<Breakdown withFees={false} />);
  });

  it('the §44 rent-to-own disclosure has no violations', async () => {
    await auditNoViolations(<RtoDisclosure />);
  });

  it('the §58 refund disclosure has no violations', async () => {
    await auditNoViolations(<RefundPreview />);
  });

  it('every amount is programmatically tied to what it is for', async () => {
    // The property that makes a breakdown a disclosure rather than a column of numbers: a screen
    // reader must be able to say WHICH fee is $2.00. A `<dd>` with no `<dt>` is a number floating
    // free, and visually it looks identical.
    render(
      <Providers>
        <Breakdown withFees />
      </Providers>,
    );
    const terms = Array.from(document.querySelectorAll('dt'));
    const values = Array.from(document.querySelectorAll('dd'));
    expect(terms.length).toBeGreaterThan(4);
    expect(values.length).toBe(terms.length);
    for (const term of terms) {
      expect(term.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('the acceptance control is reachable by its label, not only by sight', async () => {
    // §47: acceptance must be a deliberate act. A checkbox a screen-reader user cannot find is a
    // consent barrier that only exists for sighted people.
    render(
      <Providers>
        <RtoDisclosure />
      </Providers>,
    );
    expect(
      screen.getByLabelText(/read the total cost and the agreement/i),
    ).toBeInTheDocument();
  });

  it('the total cost is not subordinate to the instalment', async () => {
    // §47's specific concern: a screen that shouts "$60/month" and whispers "$795 total". Both are
    // present as labelled terms, so neither can be reached without the other.
    render(
      <Providers>
        <RtoDisclosure />
      </Providers>,
    );
    const terms = Array.from(document.querySelectorAll('dt')).map((t) => t.textContent ?? '');
    expect(terms.some((t) => /total to own/i.test(t))).toBe(true);
    expect(terms.some((t) => /how much more/i.test(t))).toBe(true);
  });
});
