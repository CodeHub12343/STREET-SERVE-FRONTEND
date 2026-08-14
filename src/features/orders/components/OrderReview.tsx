'use client';

/**
 * C-21 Order Review / cart (docs/13 C-21). Pick items, see the queue-context discount (why it's
 * there), choose a tip (round-up is the opt-in-by-default), and read the itemized total. The CTA
 * states the total on the button — no surprise amount at the next step. Creates the transaction
 * (PaymentIntent) with a stable idempotency key, then → C-22.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Stepper } from '@/components/primitives/Stepper';
import { Chip } from '@/components/primitives/Chip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { isMapDemo } from '@/lib/env';
import { useBusiness, useMenu } from '@/features/business';
import { useCartStore, cartSubtotal, type TipChoice } from '@/stores/cart.store';
import { formatCents } from '@/lib/money';
import { newIdempotencyKey } from '@/lib/idempotency';
import { AppApiError } from '@/lib/api/errors';
import { PayItForwardOffer } from '@/features/payforward';
import { computeBreakdown } from '../breakdown';
import { useCreateTransaction, useOrderQuote } from '../hooks/useOrders';
import type { OrderContext } from '../types';

export function OrderReview({ businessId, context }: { businessId: string; context: OrderContext }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: biz } = useBusiness(businessId);
  const { data: menu = [], isLoading } = useMenu(businessId);
  const create = useCreateTransaction();
  const idemKey = useRef(newIdempotencyKey());

  const { lines, tip, customTipCents, discountPercent, queuePosition, setContext, addItem, setQty, setTip } =
    useCartStore();
  const storeBusinessId = useCartStore((s) => s.businessId);

  // Ensure the cart is scoped to this business. Keeps a queue-locked discount if already set.
  useEffect(() => {
    if (storeBusinessId !== businessId) setContext(businessId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, storeBusinessId]);

  const subtotal = cartSubtotal(lines);
  // Client estimate (shows instantly + is the demo/offline answer); the server quote below is
  // authoritative and replaces it, so what's rendered pre-confirm is exactly what gets charged (R9).
  const demoBreakdown = computeBreakdown(subtotal, discountPercent, tip, customTipCents);
  const quoteItems = lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty }));
  const { data: quoted } = useOrderQuote({
    businessId,
    items: quoteItems,
    tipCents: demoBreakdown.tipCents,
    demoBreakdown,
  });
  const breakdown = quoted ?? demoBreakdown;
  const qtyOf = (itemId: string) => lines.find((l) => l.itemId === itemId)?.qty ?? 0;

  /**
   * PIF-4 — opt IN, and unchecked by default. Never pre-ticked: quietly spending a stranger's gift
   * on someone who did not ask for it is the wrong surprise on both sides of the transaction.
   */
  const [usePayItForward, setUsePayItForward] = useState(false);
  const offer = breakdown.payItForward ?? undefined;
  const coveredCents = usePayItForward ? Math.min(offer?.availableCents ?? 0, breakdown.totalCents) : 0;
  const dueCents = Math.max(0, breakdown.totalCents - coveredCents);

  // Orders are pickup-only and the server requires the business to be live + parked (Flow 2d). Show
  // that upfront instead of letting the customer build a cart and get rejected at "Continue to pay".
  // Demo mode has no backend to reject, and simulates the whole flow, so it never applies here.
  const isOpenForOrders = biz?.status === 'parked';
  if (!isMapDemo && biz && !isOpenForOrders) {
    return (
      <WizardFlow
        totalSteps={1}
        currentStep={1}
        title="Your order"
        onBack={() => router.back()}
        footer={
          <Button fullWidth onClick={() => router.replace(`/business/${businessId}`)}>
            View {biz.name}
          </Button>
        }
      >
        <EmptyState
          icon="🌙"
          title={`${biz.name} isn’t open for orders right now`}
          description="They’re not live for pickup at the moment. Follow them to get a heads-up the next time they’re nearby and open."
        />
      </WizardFlow>
    );
  }

  const proceed = () => {
    if (!biz || lines.length === 0) return;
    create.mutate(
      {
        input: { businessId, businessName: biz.name, context, lines, breakdown, usePayItForward },
        idempotencyKey: idemKey.current,
      },
      {
        onSuccess: (txn) => router.push(`/order/${txn.id}/pay`),
        onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not start payment', 'danger'),
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="Your order"
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={lines.length === 0} loading={create.isPending} onClick={proceed}>
          {lines.length === 0
            ? 'Add items to continue'
            : dueCents === 0
              ? 'Place order · nothing to pay'
              : `Continue to payment · ${formatCents(dueCents)}`}
        </Button>
      }
    >
      {context === 'window' && discountPercent > 0 ? (
        <QueueCard>
          You joined as <b>#{queuePosition}</b> in line — your <b>{discountPercent}% discount</b> is applied below.
        </QueueCard>
      ) : null}

      <SectionTitle>Menu</SectionTitle>
      {isLoading ? (
        <Skeleton $h="120px" $radius={16} />
      ) : menu.length === 0 ? (
        <EmptyState icon="🍽️" title="Menu coming soon" description="This business hasn’t posted a menu yet." />
      ) : (
        <Items>
          {menu.map((item) => (
            <Item key={item.id}>
              <ItemMain>
                {/* The order screen is where the photo earns its keep — bigger than the profile
                    preview's. Optional, so the row must stand on its own without one. */}
                {item.photoUrl ? <Thumb src={item.photoUrl} alt="" loading="lazy" /> : null}
                <div>
                  <Name>{item.name}</Name>
                  <Price className="tnum">{item.priceCents === 0 ? 'Free' : formatCents(item.priceCents)}</Price>
                </div>
              </ItemMain>
              {qtyOf(item.id) === 0 ? (
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={() => addItem({ itemId: item.id, name: item.name, priceCents: item.priceCents })}
                >
                  Add
                </Button>
              ) : (
                <Stepper value={qtyOf(item.id)} min={0} max={20} onChange={(q) => setQty(item.id, q)} ariaLabel={`Quantity of ${item.name}`} />
              )}
            </Item>
          ))}
        </Items>
      )}

      {lines.length > 0 ? (
        <>
          <SectionTitle>Tip</SectionTitle>
          <Tips>
            {(['none', 'roundup', 'custom'] as TipChoice[]).map((t) => (
              <Chip key={t} selected={tip === t} onClick={() => setTip(t, customTipCents)}>
                {t === 'none' ? 'No tip' : t === 'roundup' ? 'Round up' : 'Custom'}
              </Chip>
            ))}
          </Tips>

          <Summary>
            <Line>
              <span>Subtotal</span>
              <span className="tnum">{formatCents(breakdown.subtotalCents)}</span>
            </Line>
            {breakdown.discountCents > 0 ? (
              <Line $discount>
                <span>Discount ({breakdown.discountPercent}%)</span>
                <span className="tnum">−{formatCents(breakdown.discountCents)}</span>
              </Line>
            ) : null}
            {/* Mandated fee lines (R9) — shown when they apply. $0 in the pickup MVP, so normally
                hidden; they surface automatically once the server prices them. */}
            {breakdown.serviceFeeCents ? (
              <Line>
                <span>Service fee</span>
                <span className="tnum">{formatCents(breakdown.serviceFeeCents)}</span>
              </Line>
            ) : null}
            {breakdown.deliveryCents ? (
              <Line>
                <span>Delivery</span>
                <span className="tnum">{formatCents(breakdown.deliveryCents)}</span>
              </Line>
            ) : null}
            {breakdown.taxCents ? (
              <Line>
                <span>Tax</span>
                <span className="tnum">{formatCents(breakdown.taxCents)}</span>
              </Line>
            ) : null}
            {breakdown.processingFeeCents ? (
              <Line>
                <span>Processing</span>
                <span className="tnum">{formatCents(breakdown.processingFeeCents)}</span>
              </Line>
            ) : null}
            {breakdown.tipCents > 0 ? (
              <Line>
                <span>Tip</span>
                <span className="tnum">{formatCents(breakdown.tipCents)}</span>
              </Line>
            ) : null}
            <Total>
              <span>Total</span>
              <span className="tnum">{formatCents(breakdown.totalCents)}</span>
            </Total>
            {coveredCents > 0 ? (
              <>
                <Line $discount>
                  <span>Community fund</span>
                  <span className="tnum">−{formatCents(coveredCents)}</span>
                </Line>
                <Total>
                  <span>You pay</span>
                  <span className="tnum">{formatCents(dueCents)}</span>
                </Total>
              </>
            ) : null}
          </Summary>

          {/*
            Placed AFTER the total, so a customer sees the real price first and is never nudged into
            taking help before they know whether they need it.
          */}
          <PayItForwardOffer
            offer={offer}
            checked={usePayItForward}
            onChange={setUsePayItForward}
          />
        </>
      ) : null}
    </WizardFlow>
  );
}

const QueueCard = styled.div`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 12%, transparent)`};
  font-size: 14px;
  b {
    color: ${({ theme }) => theme.color.statusDiscount};
  }
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Items = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const ItemMain = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  min-width: 0;
`;
const Thumb = styled.img`
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.control}px;
  object-fit: cover;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Name = styled.p`
  font-weight: 600;
  font-size: 14px;
`;
const Price = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Tips = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Summary = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
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
  font-size: 16px;
  font-weight: 800;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
