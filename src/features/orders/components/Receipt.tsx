'use client';

/**
 * C-24 Receipt (docs/13 C-24, PAYMENTS_IMPLEMENTATION.md §8) — itemized: base → discount ("You
 * saved $X") → tip → fee split → total, all tabular. Shows tier-based payout timing. Server values
 * are authoritative; this renders them.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CheckCircle2 } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { useOrder } from '../hooks/useOrders';

export function Receipt({ id }: { id: string }) {
  const router = useRouter();
  const { data: txn, isLoading, isError } = useOrder(id);

  if (isLoading) return <TabPage title="Receipt"><Skeleton $h="240px" $radius={16} /></TabPage>;
  if (isError || !txn) return <TabPage title="Receipt"><ErrorState title="Receipt not found" /></TabPage>;

  const b = txn.breakdown;

  return (
    <TabPage title="Receipt">
      <Card>
        <Head>
          <CheckCircle2 size={28} aria-hidden />
          <div>
            <h2>Paid · {txn.businessName}</h2>
            <When>{formatDateTime(txn.createdAt)}</When>
          </div>
        </Head>

        <Items>
          {txn.items.map((it, i) => (
            <Line key={i}>
              <span>
                {it.qty}× {it.name}
              </span>
              <span className="tnum">{formatCents(it.priceCents * it.qty)}</span>
            </Line>
          ))}
        </Items>

        <Divider />
        <Line>
          <span>Subtotal</span>
          <span className="tnum">{formatCents(b.subtotalCents)}</span>
        </Line>
        {b.discountCents > 0 ? (
          <Line $discount>
            <span>You saved {b.discountPercent}%</span>
            <span className="tnum">−{formatCents(b.discountCents)}</span>
          </Line>
        ) : null}
        {b.tipCents > 0 ? (
          <Line>
            <span>Tip (100% to vendor)</span>
            <span className="tnum">{formatCents(b.tipCents)}</span>
          </Line>
        ) : null}
        <Total>
          <span>Total paid</span>
          <span className="tnum">{formatCents(b.totalCents)}</span>
        </Total>

        <FeeNote>
          Vendor platform fee on this sale: {formatCents(b.platformFeeCents)} · {txn.payoutTiming}
        </FeeNote>
      </Card>

      {/* Review only once the order is completed — the server requires a settled transaction, so
          offering it earlier just yields a rejection. */}
      {txn.transactionId && txn.status === 'completed' ? (
        <Button
          fullWidth
          onClick={() =>
            router.push(
              `/business/${txn.businessId}/reviews?transactionId=${encodeURIComponent(txn.transactionId!)}`,
            )
          }
        >
          Leave a review
        </Button>
      ) : txn.transactionId ? (
        <ReviewHint>You can leave a review once you’ve picked up your order.</ReviewHint>
      ) : null}
      <Button fullWidth variant="secondary" onClick={() => router.replace('/orders')}>
        Done
      </Button>
      {txn.transactionId ? (
        <ReportLink
          type="button"
          onClick={() =>
            router.push(
              `/disputes/new?refType=transaction&refId=${encodeURIComponent(txn.transactionId!)}` +
                `&subjectType=business&subjectId=${encodeURIComponent(txn.businessId)}` +
                `&subjectName=${encodeURIComponent(txn.businessName)}`,
            )
          }
        >
          Something wrong? Report a problem
        </ReportLink>
      ) : null}
    </TabPage>
  );
}

const ReviewHint = styled.p`
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ReportLink = styled.button`
  display: block;
  margin: ${({ theme }) => theme.space[3]}px auto 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-decoration: underline;
`;

const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  color: ${({ theme }) => theme.color.statusLive};
  h2 {
    font-size: 18px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const When = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Items = styled.div`
  display: grid;
  gap: 6px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const Line = styled.div<{ $discount?: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme, $discount }) => ($discount ? theme.color.statusDiscount : theme.color.textSecondary)};
`;
const Total = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 17px;
  font-weight: 800;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const FeeNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
