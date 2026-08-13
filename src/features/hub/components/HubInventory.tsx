'use client';

/**
 * H-04 Live Inventory (docs/13 H-04) — which sellers hold what, with a recall action. The map layer
 * (seller pins) shares the M3 Map when a token is set; this ships the accessible holder list.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { useHubHolders, useRecallStock } from '../hooks/useHub';

function overdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function HubInventory({ hubId }: { hubId: string }) {
  const { show } = useToast();
  const { data: holders, isLoading } = useHubHolders(hubId);
  const recall = useRecallStock(hubId);
  /** Which row is mid-confirm. Recall is binding notice, so it does not fire on one tap. */
  const [confirming, setConfirming] = useState<string | null>(null);

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;
  if (!holders || holders.length === 0) {
    return <EmptyState icon="🏪" title="No inventory out" description="When sellers check out your products, you’ll see who holds what here." />;
  }

  return (
    <Wrap>
      {holders.map((h) => (
        <Card key={h.checkoutId} $overdue={overdue(h.returnDeadline)}>
          <Avatar name={h.sellerName} size={40} />
          <Info>
            <Seller>{h.sellerName}</Seller>
            <Prod>{h.quantity - h.soldQty} of {h.quantity} {h.productName} remaining</Prod>
          </Info>
          {overdue(h.returnDeadline) ? <Overdue>Overdue</Overdue> : null}
          {/*
            ═══ Two taps, because this is binding. ═══

            Recall serves §37 termination notice: it cannot be withdrawn by the seller, it cancels
            auto-renewal, and it puts a dated obligation on someone who is out working. A one-tap
            button that fires that off a mis-tap — sitting inches from a scrolling list — is not a
            confirmation the action deserves. The confirm step also states what actually happens,
            which the old toast got wrong in both directions.
          */}
          {confirming === h.checkoutId ? (
            <Confirm>
              <ConfirmText>
                Give {h.sellerName} notice to return {h.quantity - h.soldQty} {h.productName}?
              </ConfirmText>
              <ConfirmActions>
                <Button
                  size="compact"
                  variant="secondary"
                  loading={recall.isPending}
                  onClick={() =>
                    recall.mutate(h.checkoutId, {
                      onSuccess: (res) => {
                        setConfirming(null);
                        /**
                         * The server's own deadline, not a guess. The notice period varies with the
                         * value of the goods, so the only honest thing to show is what came back.
                         */
                        show(
                          res.terminationEffectiveAt
                            ? `Notice given. ${h.sellerName} has until ${new Date(res.terminationEffectiveAt).toLocaleDateString()} to return unsold stock.`
                            : `Notice given to ${h.sellerName}.`,
                          'success',
                        );
                      },
                      onError: (e) => {
                        setConfirming(null);
                        show(
                          e instanceof AppApiError
                            ? e.message
                            : 'Couldn’t give notice. Please try again.',
                          'danger',
                        );
                      },
                    })
                  }
                >
                  Give notice
                </Button>
                <Button size="compact" variant="tertiary" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
              </ConfirmActions>
            </Confirm>
          ) : (
            /* Labelled for what it does. "Recall" implies today; §37 gives the seller days. */
            <Button
              size="compact"
              variant="secondary"
              onClick={() => setConfirming(h.checkoutId)}
            >
              Recall
            </Button>
          )}
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 640px;
`;
const Card = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $overdue }) => ($overdue ? theme.color.statusDanger : theme.color.line)};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Seller = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Prod = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
/** The confirm takes the row's full width — it replaces the button rather than crowding it. */
const Confirm = styled.div`
  flex: 1 1 100%;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const ConfirmText = styled.p`
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Overdue = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.statusDanger};
`;
