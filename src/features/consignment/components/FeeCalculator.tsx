'use client';

/**
 * S-13 Pre-publish fee calculator (R12). "If I price this at $X with a Y% split, what do I take
 * home, and what does the customer pay?" — answered by the server (same registry + settlement math
 * the real payout uses), so the preview is accurate, not a guess. The seller's net is the headline;
 * platform fee and hub share are shown so the split is transparent.
 *
 * §57.2 adds the rent-to-own half, behind a toggle so a plain consignment listing is not asked to
 * reason about instalments it will never have. Every RTO row comes from the same `computeRtoQuote`
 * the customer's disclosure uses — a calculator that approximates is worse than none, because it
 * will be believed.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/primitives/Input';
import { formatCents } from '@/lib/money';
import { useFeePreview } from '../hooks/useConsignment';

function parseDollars(v: string): number {
  const n = Math.round(Number(v.replace(/[^0-9.]/g, '')) * 100);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function FeeCalculator({ defaultSplitPercent = 70 }: { defaultSplitPercent?: number }) {
  const [priceStr, setPriceStr] = useState('');
  const [splitStr, setSplitStr] = useState(String(defaultSplitPercent));
  const [showRto, setShowRto] = useState(false);
  const [installments, setInstallments] = useState('12');
  const [markupPct, setMarkupPct] = useState('20');
  const [upfrontStr, setUpfrontStr] = useState('');

  const unitPriceCents = parseDollars(priceStr);
  const splitPercent = Math.max(0, Math.min(100, Math.round(Number(splitStr) || 0)));
  const { data } = useFeePreview(
    unitPriceCents,
    splitPercent,
    1,
    showRto
      ? {
          installmentCount: Math.max(1, Number(installments) || 1),
          frequency: 'monthly',
          markupBps: Math.max(0, Math.round(Number(markupPct) * 100) || 0),
          initialPaymentCents: parseDollars(upfrontStr),
        }
      : undefined,
  );
  const showing = useMemo(() => unitPriceCents > 0 && data, [unitPriceCents, data]);

  return (
    <Card aria-labelledby="calc-heading">
      <Head id="calc-heading">
        <Calculator size={15} aria-hidden /> What you’ll take home
      </Head>
      <Hint>Enter a price to see your net payout before you list — fees are the platform’s, computed live.</Hint>

      <Inputs>
        <Field>
          <Input
            label="Item price"
            inputMode="decimal"
            placeholder="$0.00"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
          />
        </Field>
        <Field $narrow>
          <Input
            label="Your split %"
            inputMode="numeric"
            value={splitStr}
            onChange={(e) => setSplitStr(e.target.value)}
          />
        </Field>
      </Inputs>

      {showing && data ? (
        <>
          <Net>
            <span>Your net payout</span>
            <b className="tnum">{formatCents(data.sellerNetCents)}</b>
          </Net>
          <Rows>
            <Line>
              <span>Sale price</span>
              <span className="tnum">{formatCents(data.grossCents)}</span>
            </Line>
            <Line>
              <span>Platform fee (10%)</span>
              <span className="tnum">−{formatCents(data.platformFeeCents)}</span>
            </Line>
            <Line>
              <span>Hub share ({100 - splitPercent}%)</span>
              <span className="tnum">−{formatCents(data.hubShareCents)}</span>
            </Line>
            <Total>
              <span>Your net ({splitPercent}%)</span>
              <span className="tnum">{formatCents(data.sellerNetCents)}</span>
            </Total>
          </Rows>

          <CustomerBlock>
            <SubHead>Customer pays</SubHead>
            <Line>
              <span>Subtotal</span>
              <span className="tnum">{formatCents(data.customer.subtotalCents)}</span>
            </Line>
            {data.customer.serviceFeeCents > 0 ? (
              <Line>
                <span>Service fee (est.)</span>
                <span className="tnum">{formatCents(data.customer.serviceFeeCents)}</span>
              </Line>
            ) : null}
            {data.customer.processingFeeCents > 0 ? (
              <Line>
                <span>Processing (est.)</span>
                <span className="tnum">{formatCents(data.customer.processingFeeCents)}</span>
              </Line>
            ) : null}
            {data.customer.taxCents > 0 ? (
              <Line>
                <span>Tax (est.)</span>
                <span className="tnum">{formatCents(data.customer.taxCents)}</span>
              </Line>
            ) : null}
            <Total>
              <span>Customer total</span>
              <span className="tnum">{formatCents(data.customer.totalCents)}</span>
            </Total>
          </CustomerBlock>

          <RtoToggle type="button" aria-pressed={showRto} onClick={() => setShowRto((v) => !v)}>
            {showRto ? 'Hide rent-to-own' : 'Price this as rent-to-own'}
          </RtoToggle>

          {showRto ? (
            <CustomerBlock>
              <SubHead>Rent to own</SubHead>
              <Inputs>
                <Field $narrow>
                  <Input
                    label="Payments"
                    inputMode="numeric"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                  />
                </Field>
                <Field $narrow>
                  <Input
                    label="Markup %"
                    inputMode="decimal"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(e.target.value)}
                  />
                </Field>
                <Field $narrow>
                  <Input
                    label="Up front"
                    inputMode="decimal"
                    placeholder="$0.00"
                    value={upfrontStr}
                    onChange={(e) => setUpfrontStr(e.target.value)}
                  />
                </Field>
              </Inputs>

              {data.rto ? (
                <>
                  <Line>
                    <span>Customer pays up front</span>
                    <span className="tnum">{formatCents(data.rto.initialPaymentCents)}</span>
                  </Line>
                  <Line>
                    <span>
                      Then {data.rto.installmentCount} × monthly
                    </span>
                    <span className="tnum">{formatCents(data.rto.installmentAmountCents)}</span>
                  </Line>
                  <Line>
                    <span>Platform fee per payment</span>
                    <span className="tnum">−{formatCents(data.rto.platformFeePerPaymentCents)}</span>
                  </Line>
                  <Line>
                    <span>Early payoff today</span>
                    <span className="tnum">{formatCents(data.rto.earlyPayoffCents)}</span>
                  </Line>
                  <Total>
                    <span>You earn overall</span>
                    <span className="tnum">{formatCents(data.rto.sellerTotalEarningsCents)}</span>
                  </Total>
                  {/*
                    §47 — the seller sees the same "costs more than buying outright" delta their
                    customer will. Pricing a deal without seeing what it costs the person taking it
                    is how a seller ends up defending a number they never looked at.
                  */}
                  <RtoNote>
                    The customer pays <b className="tnum">{formatCents(data.rto.totalToOwnCents)}</b>{' '}
                    in total — {formatCents(data.rto.costOverCashCents)} more than buying it outright.
                  </RtoNote>
                </>
              ) : null}
            </CustomerBlock>
          ) : null}
        </>
      ) : (
        <Empty>Enter an item price to preview your payout.</Empty>
      )}
    </Card>
  );
}

const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  svg {
    color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: -6px;
`;
const Inputs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Field = styled.div<{ $narrow?: boolean }>`
  display: grid;
  gap: 4px;
  flex: ${({ $narrow }) => ($narrow ? '0 0 96px' : '1')};
  min-width: 0;
`;
const Net = styled.div`
  display: grid;
  gap: 4px;
  margin-top: ${({ theme }) => theme.space[2]}px;
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    font-size: 36px;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const Rows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Line = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Total = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 800;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textPrimary};
`;
const CustomerBlock = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
`;
const SubHead = styled.h3`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Empty = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const RtoToggle = styled.button`
  justify-self: start;
  background: none;
  border: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
  text-decoration: underline;
  cursor: pointer;
`;
const RtoNote = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.statusWarning};
  b {
    font-weight: 800;
  }
`;
