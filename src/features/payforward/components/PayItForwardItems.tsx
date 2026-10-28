'use client';

/**
 * ═══ PIF-II — specific-item ("suspended coffee") card. ═══
 *
 * Lives inside BusinessProfileSheet alongside the existing pool `PayItForwardCard`. Two jobs:
 *   • Show the FIFO queue of items currently waiting for a claimer at this business.
 *   • Let a signed-in customer buy a specific menu item for the next customer.
 *
 * The card renders nothing when the business has no claimable items AND has `accepting_items`
 * off — a quiet section nobody can act on is noise. The buy flow uses the existing payment
 * sheet, same rail as the pool contribution.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Coffee, HeartHandshake, Clock } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Modal } from '@/components/primitives/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { newIdempotencyKey } from '@/lib/idempotency';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import { isAuthConfigured } from '@/lib/env';

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

interface ContributeResponse {
  id: string;
  businessId: string;
  menuItemId: string;
  menuItemName: string;
  amountCents: number;
  clientSecret: string | null;
  status: 'pending';
}

interface MenuItem {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
}

export function PayItForwardItems({
  businessId,
  menu,
  businessName,
}: {
  businessId: string;
  menu: MenuItem[];
  businessName: string;
}) {
  const qc = useQueryClient();
  const { show } = useToast();
  const { isSignedIn, isLoaded } = useAuthCompat();
  const needsSignIn = isAuthConfigured && isLoaded && !isSignedIn;

  const items = useQuery<ClaimableItem[]>({
    queryKey: ['payforward', businessId, 'items'],
    queryFn: () => api.get<ClaimableItem[]>(endpoints.payForward(businessId).items),
    staleTime: 30_000,
  });

  const [buyOpen, setBuyOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [note, setNote] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [awaitingPay, setAwaitingPay] = useState<ContributeResponse | null>(null);

  const availableMenu = menu.filter((m) => m.isAvailable);

  const contribute = useMutation<ContributeResponse>({
    mutationFn: () =>
      api.post<ContributeResponse>(
        endpoints.payForward(businessId).itemsContribute,
        {
          menuItemId: selectedMenuItemId,
          anonymous,
          ...(anonymous ? {} : { displayName: displayName.trim() }),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
        { idempotencyKey: newIdempotencyKey() },
      ),
    onSuccess: (res) => {
      if (!res.clientSecret) {
        show("Couldn't start the payment. Nothing was charged — please try again.", 'warning');
        return;
      }
      setAwaitingPay(res);
    },
    onError: (err) => {
      show(err instanceof AppApiError ? err.message : 'Could not start your contribution', 'danger');
    },
  });

  if (items.isLoading) {
    return <Skeleton $h="120px" $radius={16} />;
  }

  const queue = items.data ?? [];
  const hasQueue = queue.length > 0;

  /** Collapse the card when there's nothing claimable AND no way to contribute (menu empty). */
  if (!hasQueue && availableMenu.length === 0) return null;

  return (
    <Wrap>
      <Head>
        <HeartHandshake size={16} aria-hidden />
        <HeadTitle>Pay It Forward — specific items</HeadTitle>
      </Head>

      {hasQueue ? (
        <QueueList>
          {queue.slice(0, 8).map((item) => (
            <QueueRow key={item.id}>
              <Coffee size={14} aria-hidden />
              <QueueName>{item.menuItemName}</QueueName>
              <QueuePrice className="tnum">{formatCents(item.priceCents)}</QueuePrice>
              {item.note ? <QueueNote>&ldquo;{item.note}&rdquo;</QueueNote> : null}
              {item.displayName ? <QueueGiver>— {item.displayName}</QueueGiver> : null}
            </QueueRow>
          ))}
          {queue.length > 8 ? <QueueMore>+ {queue.length - 8} more waiting</QueueMore> : null}
        </QueueList>
      ) : (
        <Empty>
          No items waiting right now. Be the first to buy one for the next customer at
          {' '}
          {businessName}.
        </Empty>
      )}

      {availableMenu.length > 0 ? (
        <Button fullWidth onClick={() => setBuyOpen(true)}>
          <HeartHandshake size={14} aria-hidden /> Buy an item for the next customer
        </Button>
      ) : null}

      {/* Buy modal */}
      <Modal
        open={buyOpen && !awaitingPay}
        onClose={() => setBuyOpen(false)}
        title="Buy for the next customer"
      >
        <ModalBody>
          <ModalLede>
            Pick an item. We charge your card now; the next eligible customer picks it off the
            queue when they order. If nobody claims it, you&apos;re refunded automatically.
          </ModalLede>

          <SelectRow>
            <SelectLabel>Item</SelectLabel>
            <Select
              value={selectedMenuItemId}
              onChange={(e) => setSelectedMenuItemId(e.target.value)}
            >
              <option value="">Choose an item…</option>
              {availableMenu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {formatCents(m.priceCents)}
                </option>
              ))}
            </Select>
          </SelectRow>

          <Input
            label="Note to the recipient (optional)"
            placeholder='e.g. "Have a good day"'
            hint="Max 280 characters."
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <AnonRow>
            <input
              type="checkbox"
              id="pif-anonymous"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <label htmlFor="pif-anonymous">Keep my name hidden (recommended)</label>
          </AnonRow>
          {!anonymous ? (
            <Input
              label="Name to show"
              hint="Shown alongside the item on this business's profile."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          ) : null}

          {needsSignIn ? (
            <SignInNote>You&apos;ll be asked to sign in before paying.</SignInNote>
          ) : null}

          <Button
            fullWidth
            disabled={!selectedMenuItemId}
            loading={contribute.isPending}
            onClick={() => contribute.mutate()}
          >
            Continue to payment
          </Button>
        </ModalBody>
      </Modal>

      {/* Payment sheet (step 2) */}
      <Modal
        open={Boolean(awaitingPay)}
        onClose={() => {
          setAwaitingPay(null);
          setBuyOpen(false);
        }}
        title={`Pay ${awaitingPay ? formatCents(awaitingPay.amountCents) : ''}`}
      >
        {awaitingPay ? (
          <ModalBody>
            <ModalLede>
              {awaitingPay.menuItemName} for the next customer at {businessName}.
            </ModalLede>
            <PaymentSheet
              clientSecret={awaitingPay.clientSecret ?? 'demo'}
              amountCents={awaitingPay.amountCents}
              onSuccess={() => {
                show("Thanks — your item is on the queue once the payment confirms.", 'success');
                setAwaitingPay(null);
                setBuyOpen(false);
                setSelectedMenuItemId('');
                setNote('');
                void qc.invalidateQueries({ queryKey: ['payforward', businessId, 'items'] });
              }}
            />
            <Reassure>
              <Clock size={14} aria-hidden />
              If nobody claims the item within the business&apos;s expiry window, we refund your
              card automatically.
            </Reassure>
          </ModalBody>
        ) : null}
      </Modal>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HeadTitle = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 15px;
  font-weight: 800;
`;

const QueueList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const QueueRow = styled.li`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 13.5px;
`;

const QueueName = styled.span`
  font-weight: 700;
`;

const QueuePrice = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const QueueNote = styled.span`
  grid-column: 2 / 4;
  font-size: 12.5px;
  font-style: italic;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const QueueGiver = styled.span`
  grid-column: 2 / 4;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const QueueMore = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  padding: 4px 12px;
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 13px;
  line-height: 1.5;
`;

const ModalBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const ModalLede = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const SelectRow = styled.div`
  display: grid;
  gap: 4px;
`;

const SelectLabel = styled.span`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Select = styled.select`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  font-size: 14px;
`;

const AnonRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
`;

const SignInNote = styled.p`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Reassure = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
