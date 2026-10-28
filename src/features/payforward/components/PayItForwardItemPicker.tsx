'use client';

/**
 * ═══ PIF-II — order-flow claim picker. ═══
 *
 * Lives on the Order Review step. Shows the FIFO queue of suspended items at this business,
 * filtered to those whose menu_item_id matches an item in the current cart. A customer can pick
 * one; its id + cover amount flow back to the parent via `onSelect`.
 *
 * Collapses to nothing when:
 *   • The queue is empty.
 *   • Nothing in the cart matches a queued item.
 *   • The pool opt-in is already active (mutual exclusion — the parent handles the state).
 *
 * The server validates everything again at `POST /orders` time: an unavailable item or a
 * cart-doesn't-include-it mismatch is refused there with a precise message. This UI is a
 * convenience and a confirmation, not the gate.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Coffee, HeartHandshake } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { formatCents } from '@/lib/money';

interface ClaimableItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  priceCents: number;
  note: string | null;
  displayName: string | null;
  fundedAt: string;
  expiresAt: string;
}

export function PayItForwardItemPicker({
  businessId,
  cartItemIds,
  selectedId,
  poolSelected,
  onSelect,
}: {
  businessId: string;
  cartItemIds: string[];
  selectedId: string | null;
  /** True when the pool is active; we hide the picker in that case. */
  poolSelected: boolean;
  /** `id === null` clears the selection. */
  onSelect: (id: string | null, coverCents: number) => void;
}) {
  const { data } = useQuery<ClaimableItem[]>({
    queryKey: ['payforward', businessId, 'items', 'order-review'],
    queryFn: () => api.get<ClaimableItem[]>(endpoints.payForward(businessId).items),
    staleTime: 30_000,
  });

  if (poolSelected) return null;
  const cart = new Set(cartItemIds);
  const eligible = (data ?? []).filter((it) => cart.has(it.menuItemId));
  if (eligible.length === 0) return null;

  return (
    <Wrap>
      <Head>
        <HeartHandshake size={14} aria-hidden />
        <HeadTitle>Claim a suspended item</HeadTitle>
      </Head>
      <Lede>
        Someone pre-paid for one of the items in your cart. Pick it to cover that line — the
        contributor&apos;s intent was for the next customer, which could be you.
      </Lede>
      <List role="radiogroup" aria-label="Suspended items you can claim">
        {eligible.map((it) => {
          const isSelected = selectedId === it.id;
          return (
            <Row
              key={it.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              $selected={isSelected}
              onClick={() => {
                if (isSelected) {
                  onSelect(null, 0);
                } else {
                  onSelect(it.id, it.priceCents);
                }
              }}
            >
              <Coffee size={14} aria-hidden />
              <RowMain>
                <RowName>{it.menuItemName}</RowName>
                {it.note ? <RowNote>&ldquo;{it.note}&rdquo;</RowNote> : null}
                {it.displayName ? <RowGiver>From {it.displayName}</RowGiver> : null}
              </RowMain>
              <RowCover className="tnum">−{formatCents(it.priceCents)}</RowCover>
            </Row>
          );
        })}
      </List>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const Head = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const HeadTitle = styled.span``;

const Lede = styled.p`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Row = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  text-align: left;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.surfaceRaised2 : theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $selected }) => ($selected ? theme.color.accentPrimary : theme.color.line)};
`;

const RowMain = styled.span`
  display: grid;
  gap: 2px;
`;

const RowName = styled.span`
  font-size: 14px;
  font-weight: 700;
`;

const RowNote = styled.span`
  font-size: 12.5px;
  font-style: italic;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const RowGiver = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const RowCover = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.color.statusLive};
`;
