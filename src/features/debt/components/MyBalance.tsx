'use client';

/**
 * S-14 My balance (Phase 3 cash rail).
 *
 * The copy here is deliberate. A seller who took cash owes the hub's share and the platform's fee,
 * but framing that as *debt collection* would be both inaccurate and harmful to the people this
 * product exists for. It is a deduction from money they have already earned — so it reads as
 * "comes out of your next card sale", never as "you owe us".
 */
import styled from 'styled-components';
import { TrendingUp, Wallet, Check } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { TrustBenefits } from '@/features/finance';
import { useCreditStatus, useMyDebts, useRepayDebt } from '../hooks/useDebt';

const ORIGIN_LABEL: Record<string, string> = {
  cash_sale: 'Cash sale',
  lost_inventory: 'Lost inventory',
  damaged_inventory: 'Damaged inventory',
  refund_clawback: 'Refund',
  chargeback: 'Chargeback',
};

export function MyBalance() {
  const { data: debts, isLoading } = useMyDebts();
  const { data: credit } = useCreditStatus();
  const repay = useRepayDebt();

  if (isLoading) {
    return (
      <TabPage title="My balance">
        <Skeleton $h="140px" $radius={16} />
      </TabPage>
    );
  }

  const outstanding = debts?.totalOutstandingCents ?? 0;
  const open = (debts?.debts ?? []).filter((d) => d.outstandingCents > 0);
  /**
   * Settled balances, newest first. Without this the money vanishes silently: a card sale nets off
   * what was owed, the row disappears, and the seller is left with a "$20.75 came out of your sale"
   * notification and a page saying "Nothing owed" — no way to reconcile the two.
   */
  const cleared = (debts?.debts ?? [])
    .filter((d) => d.outstandingCents === 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <TabPage title="My balance">
      {credit?.overDebtLimit ? (
        <Banner tone="warning" title="Clear your balance to take more stock">
          New checkouts are paused until this comes down. Your next card sale clears it
          automatically, or you can settle it now.
        </Banner>
      ) : null}

      <Tiles>
        <Tile $accent={outstanding > 0}>
          <TileIcon><Wallet size={16} aria-hidden /></TileIcon>
          <TileLabel>Comes out of your next sale</TileLabel>
          <TileValue className="tnum">{formatCents(outstanding)}</TileValue>
          <TileHint>
            {outstanding > 0
              ? 'From cash sales — the hub’s share and platform fee'
              : 'Nothing owed — you’re all square'}
          </TileHint>
        </Tile>

        {credit ? (
          <Tile>
            <TileIcon><TrendingUp size={16} aria-hidden /></TileIcon>
            <TileLabel>Stock you can take</TileLabel>
            <TileValue className="tnum">{formatCents(credit.availableInventoryCents)}</TileValue>
            <TileHint>
              Holding {formatCents(credit.currentInventoryValueCents)} of{' '}
              {formatCents(credit.maxInventoryValueCents)} · {credit.tier}
              {/* A-3: name the Trust band too. Two levers raise this ceiling, and a seller who only
                  ever sees the tier will assume verification is the only one. */}
              {credit.trustBandLabel ? ` · ${credit.trustBandLabel}` : ''}
            </TileHint>
          </Tile>
        ) : null}
      </Tiles>

      {credit && credit.availableInventoryCents < credit.maxInventoryValueCents ? (
        <Explainer>
          Your limit grows as you complete consignments. Selling by card builds it faster, because
          those sales are verified.
        </Explainer>
      ) : null}

      {/* A-3: what the Trust Score actually buys, on the screen where its effects are felt. */}
      <TrustBenefits />

      {open.length === 0 && cleared.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Nothing owed"
          description="When you take cash for a sale, the hub’s share shows up here and comes out of your next card sale."
        />
      ) : null}

      {open.length > 0 ? (
        <List>
          {open.map((d) => (
            <Row key={d.id}>
              <RowMain>
                <RowTitle>{ORIGIN_LABEL[d.originType] ?? d.originType}</RowTitle>
                <RowMeta>
                  Hub {formatCents(d.hubShareCents)} · fee {formatCents(d.platformFeeCents)}
                </RowMeta>
              </RowMain>
              <RowAmount className="tnum">{formatCents(d.outstandingCents)}</RowAmount>
              <Button
                size="compact"
                variant="secondary"
                loading={repay.isPending && repay.variables?.id === d.id}
                onClick={() => repay.mutate({ id: d.id, amountCents: d.outstandingCents })}
              >
                Clear now
              </Button>
            </Row>
          ))}
        </List>
      ) : null}

      {cleared.length > 0 ? (
        <>
          <SectionTitle>Recently cleared</SectionTitle>
          <List>
            {cleared.map((d) => (
              <Row key={d.id} $muted>
                <RowMain>
                  <RowTitle>{ORIGIN_LABEL[d.originType] ?? d.originType}</RowTitle>
                  <RowMeta>
                    Hub {formatCents(d.hubShareCents)} · fee {formatCents(d.platformFeeCents)}
                  </RowMeta>
                </RowMain>
                <ClearedAmount className="tnum">{formatCents(d.principalCents)}</ClearedAmount>
                <ClearedTag>
                  <Check size={13} aria-hidden /> Cleared
                </ClearedTag>
              </Row>
            ))}
          </List>
          <Explainer>
            Taken out of a later card sale — you didn’t pay this separately.
          </Explainer>
        </>
      ) : null}
    </TabPage>
  );
}

const Tiles = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;
const Tile = styled.div<{ $accent?: boolean }>`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ $accent, theme }) => ($accent ? theme.color.statusWarning : theme.color.line)};
`;
const TileIcon = styled.div`
  color: ${({ theme }) => theme.color.textTertiary};
`;
const TileLabel = styled.p`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const TileValue = styled.p`
  font-size: 26px;
  font-weight: 800;
`;
const TileHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Explainer = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $muted }) => ($muted ? 'transparent' : theme.color.surfaceRaised)};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const SectionTitle = styled.h2`
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[2]}px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ClearedAmount = styled.p`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
  text-decoration: line-through;
`;
const ClearedTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusLive};
`;
const RowMain = styled.div`
  flex: 1;
  min-width: 0;
`;
const RowTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
`;
const RowMeta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const RowAmount = styled.p`
  font-size: 16px;
  font-weight: 800;
`;
