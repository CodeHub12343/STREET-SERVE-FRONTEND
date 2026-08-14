'use client';

/**
 * 7.6 / P-15 — the vendor's flash-sale manager.
 *
 * The two constraints the server enforces are stated here **before** the vendor submits, not after
 * it rejects them: a sale cannot start in the past (it would re-price orders already placed), and it
 * cannot run longer than the maximum (past that, change the price so the menu tells the truth).
 * Learning a limit from an error message is how a vendor concludes the feature is broken.
 *
 * It also says the thing a vendor most needs to know and would not guess: discounts do not stack. A
 * 30% sale during a busy line-up does not become 44% off.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Tag } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import { useAllFlashSales, useCancelFlashSale, useCreateFlashSale } from '../hooks/useBackoffice';

/** Mirrors the server's `MAX_FLASH_SALE_DAYS`. */
const MAX_DAYS = 14;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Live = styled.span<{ $live: boolean }>`
  flex: none;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme, $live }) => ($live ? theme.color.statusLive : theme.color.textTertiary)};
`;
const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
  font-size: 13px;
  font-weight: 600;
`;
const Input = styled.input`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceBase};
  color: ${({ theme }) => theme.color.textPrimary};
`;

function localInputValue(date: Date): string {
  // datetime-local wants local time with no zone, so the offset has to come off first.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function FlashSaleManager({ businessId }: { businessId: string }) {
  const sales = useAllFlashSales(businessId);
  const create = useCreateFlashSale(businessId);
  const cancel = useCancelFlashSale(businessId);

  const [percent, setPercent] = useState(20);
  const [startsAt, setStartsAt] = useState(localInputValue(new Date(Date.now() + 5 * 60_000)));
  const [endsAt, setEndsAt] = useState(localInputValue(new Date(Date.now() + 3 * 3_600_000)));
  const [error, setError] = useState<string | null>(null);

  if (sales.isLoading) {
    return (
      <TabPage title="Flash sales" backHref="/vendor" backLabel="Back to dashboard">
        <Skeleton $h="140px" $radius={16} />
      </TabPage>
    );
  }

  return (
    <TabPage title="Flash sales" backHref="/vendor" backLabel="Back to dashboard">
      <List>
        {/* The thing a vendor would not guess and would be upset to discover from a receipt. */}
        <Banner tone="info">
          Discounts don’t stack. If someone already has a line-up discount, they get whichever is
          bigger — not both added together.
        </Banner>

        <Card as="form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            setError(null);
            const start = new Date(startsAt);
            const end = new Date(endsAt);
            if (end <= start) {
              setError('The sale has to end after it starts.');
              return;
            }
            if (end.getTime() - start.getTime() > MAX_DAYS * 86_400_000) {
              setError(
                `A flash sale can run for up to ${MAX_DAYS} days. For anything longer, change the item’s price so your menu shows what customers actually pay.`,
              );
              return;
            }
            if (start.getTime() < Date.now() - 60_000) {
              setError('A sale can’t start in the past — it would re-price orders already placed.');
              return;
            }
            create.mutate(
              { percent, startsAt: start.toISOString(), endsAt: end.toISOString() },
              {
                onError: (err) =>
                  setError(err instanceof Error ? err.message : 'Could not create that sale.'),
              },
            );
          }}
        >
          <strong>Run a sale</strong>
          <Field>
            How much off (%)
            <Input
              type="number"
              min={1}
              max={90}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </Field>
          <Field>
            Starts
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field>
            Ends
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
          <Muted>Up to {MAX_DAYS} days. Longer than that, change your prices instead.</Muted>
          {error ? <Banner tone="warning">{error}</Banner> : null}
          <Button type="submit" disabled={create.isPending}>
            Start sale
          </Button>
        </Card>

        {(sales.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Tag size={28} aria-hidden />}
            title="No sales yet"
            description="A short sale is a good way to move stock before you pack up."
          />
        ) : (
          (sales.data ?? []).map((sale) => (
            <Card key={sale.id}>
              <Row>
                <div>
                  <strong>{sale.label}</strong>
                  <Muted>
                    {new Date(sale.startsAt).toLocaleString()} →{' '}
                    {new Date(sale.endsAt).toLocaleString()}
                  </Muted>
                </div>
                <Live $live={sale.live}>
                  {sale.cancelled ? 'Cancelled' : sale.live ? 'Live' : 'Scheduled'}
                </Live>
              </Row>
              {sale.live && !sale.cancelled ? (
                <Button variant="tertiary" onClick={() => cancel.mutate(sale.id)}>
                  End it now
                </Button>
              ) : null}
            </Card>
          ))
        )}
      </List>
    </TabPage>
  );
}
