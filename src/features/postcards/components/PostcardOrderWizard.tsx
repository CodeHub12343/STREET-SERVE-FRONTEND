'use client';

/**
 * ═══ THE ORDER WIZARD (PC-10) ═══
 *
 * Product → area → quantity → artwork → review & pay.
 *
 * ## Why the steps are in this order
 *
 * Not arbitrary, and not the order the data model suggests. It is ordered so that **everything that
 * can go wrong is discovered before any money moves**, because what is being bought cannot be
 * un-bought: once the vendor's daily batch closes, the paper is printed.
 *
 * Artwork sits before review for exactly that reason. Pre-press runs on upload — resolution, page
 * size, colour — so a file that would print badly is caught while the fix is still "export it
 * again", rather than "we charged you and posted 2,000 blurry cards" (ARCHITECTURAL_IMPROVEMENTS §7).
 *
 * ## Drafts live on the server, not in the browser
 *
 * Each step commits as it is completed, so there is no wizard state to lose: close the tab, come
 * back, resume where it stopped. It also means the price and the deliverable count are always the
 * vendor's numbers rather than anything computed on this side (audit F-9).
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Spinner } from '@/components/feedback/Spinner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import {
  useConfigureOrder,
  useCreateOrder,
  usePostcardOrder,
  usePostcardProducts,
  useQuoteOrder,
} from '../hooks/usePostcards';
import type { MailClass, PostcardOrder } from '../types';
import { AreaStep } from './steps/AreaStep';
import { ArtworkStep } from './steps/ArtworkStep';
import { ProductStep } from './steps/ProductStep';
import { QuantityStep } from './steps/QuantityStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = [
  { key: 'product', label: 'Postcard' },
  { key: 'area', label: 'Where' },
  { key: 'quantity', label: 'How many' },
  { key: 'artwork', label: 'Design' },
  { key: 'review', label: 'Review & pay' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

/**
 * The furthest step the order has actually earned.
 *
 * Derived from the ORDER rather than tracked in state, so a resumed draft opens on the right step
 * and the progress indicator can never disagree with what the server believes exists.
 */
function furthestStep(order: PostcardOrder | undefined): StepKey {
  if (!order) return 'product';
  if (!order.audienceId) return 'area';
  if (!order.quantity) return 'quantity';
  if (!order.assetId) return 'artwork';
  return 'review';
}

export function PostcardOrderWizard({
  businessId,
  orderId: existingOrderId,
  onOrderCreated,
}: {
  businessId: string;
  orderId?: string;
  onOrderCreated?: (orderId: string) => void;
}) {
  const { show } = useToast();
  const [orderId, setOrderId] = useState<string | undefined>(existingOrderId);
  const [step, setStep] = useState<StepKey>(existingOrderId ? 'review' : 'product');

  const products = usePostcardProducts();
  const order = usePostcardOrder(orderId);
  const createOrder = useCreateOrder(businessId);
  const configure = useConfigureOrder(orderId, businessId);
  const quote = useQuoteOrder(orderId);

  const reachedIndex = STEPS.findIndex((s) => s.key === furthestStep(order.data));
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  const product = useMemo(
    () => products.data?.find((p) => p.sku === order.data?.sku),
    [products.data, order.data?.sku],
  );

  const report = (err: unknown, fallback: string): void => {
    show(err instanceof AppApiError ? err.message : fallback, 'danger');
  };

  async function handleProductChosen(sku: string, mailClass: MailClass): Promise<void> {
    if (orderId) {
      setStep('area');
      return;
    }
    try {
      const created = await createOrder.mutateAsync({ sku, mailClass });
      setOrderId(created.id);
      onOrderCreated?.(created.id);
      setStep('area');
    } catch (err) {
      report(err, 'We could not start that order.');
    }
  }

  async function handleAudienceChosen(audienceId: string): Promise<void> {
    try {
      await configure.mutateAsync({ audienceId });
      setStep('quantity');
    } catch (err) {
      report(err, 'We could not attach that area.');
    }
  }

  async function handleQuantityChosen(quantity: number, mailDate: string): Promise<void> {
    try {
      await configure.mutateAsync({ quantity, mailDate });
      setStep('artwork');
    } catch (err) {
      report(err, 'We could not set that quantity.');
    }
  }

  async function handleArtworkChosen(assetId: string): Promise<void> {
    try {
      await configure.mutateAsync({ assetId });
      // Price it now, so review opens on a real number instead of a spinner.
      await quote.mutateAsync();
      setStep('review');
    } catch (err) {
      report(err, 'We could not attach that artwork.');
    }
  }

  if (products.isLoading || (orderId && order.isLoading)) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }

  return (
    <Root>
      {/**
       * A real ordered list, so assistive tech announces position without being told. Completed
       * steps stay clickable because going back to change the area is an ordinary thing to want;
       * steps not yet earned are genuinely disabled rather than merely styled that way.
       */}
      <Steps aria-label="Order progress">
        {STEPS.map((s, i) => {
          const state = i < reachedIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
          return (
            <li key={s.key}>
              <StepButton
                type="button"
                disabled={i > reachedIndex}
                aria-current={i === currentIndex ? 'step' : undefined}
                onClick={() => setStep(s.key)}
                $state={state}
              >
                <StepIndex aria-hidden>{i + 1}</StepIndex>
                <StepLabel>{s.label}</StepLabel>
                <Hidden>
                  {state === 'done' ? ' — completed' : state === 'current' ? ' — current step' : ''}
                </Hidden>
              </StepButton>
            </li>
          );
        })}
      </Steps>

      {/*
        On a phone the row shows numbers only, so the current step needs naming somewhere. Marked
        aria-hidden because the button itself already announces its label and position — this is the
        same information rendered a second time for sighted users, not new information.
      */}
      <CurrentStep aria-hidden>
        Step {currentIndex + 1} of {STEPS.length} — {STEPS[currentIndex]?.label}
      </CurrentStep>

      {order.data?.submissionProblem ? (
        <Banner tone="danger" title="This order did not reach the printer">
          {order.data.submissionProblem.message ??
            'Something went wrong after payment. Our team has been alerted and will be in touch.'}
        </Banner>
      ) : null}

      <Panel>
        {step === 'product' ? (
          <ProductStep
            products={products.data ?? []}
            selectedSku={order.data?.sku}
            busy={createOrder.isPending}
            locked={Boolean(orderId)}
            onChoose={(sku, mc) => void handleProductChosen(sku, mc)}
          />
        ) : null}

        {step === 'area' && orderId ? (
          <AreaStep
            businessId={businessId}
            selectedAudienceId={order.data?.audienceId ?? null}
            busy={configure.isPending}
            onChoose={(id) => void handleAudienceChosen(id)}
          />
        ) : null}

        {step === 'quantity' && order.data ? (
          <QuantityStep
            order={order.data}
            product={product}
            busy={configure.isPending}
            onConfirm={(q, d) => void handleQuantityChosen(q, d)}
          />
        ) : null}

        {step === 'artwork' && order.data ? (
          <ArtworkStep
            businessId={businessId}
            sku={order.data.sku}
            currentAssetId={order.data.assetId}
            busy={configure.isPending || quote.isPending}
            onConfirm={(id) => void handleArtworkChosen(id)}
          />
        ) : null}

        {step === 'review' && order.data ? (
          <ReviewStep order={order.data} businessId={businessId} />
        ) : null}
      </Panel>

      <Footer>
        <Button
          variant="tertiary"
          disabled={currentIndex === 0}
          onClick={() => setStep(STEPS[Math.max(0, currentIndex - 1)]!.key)}
        >
          Back
        </Button>
      </Footer>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]}px;
  /* Nothing inside the wizard may widen the page; the step row scrolls itself instead. */
  min-width: 0;
`;

const Centered = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]}px;
`;

/**
 * Five labelled chips do not fit across a phone, and the previous answer — scroll sideways — was
 * the wrong one. The row auto-scrolled to the current step, so the user arrived on step 3 to find
 * steps 1 and 2 already off the left edge and a chip clipped against it. That reads as a broken,
 * horizontally-overflowing page, not as a scrollable control, and there is nothing on screen to
 * suggest otherwise.
 *
 * Below `sm` the labels collapse (see StepLabel) and the row becomes five numbered dots that fit
 * with room to spare — no scrolling, every step still visible and tappable, and the current step's
 * name rendered underneath instead. The full labelled row returns at `sm` and up, where it fits.
 */
const Steps = styled.ol`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  list-style: none;
  margin: 0;
  padding: 0 0 ${({ theme }) => theme.space[1]}px;
  max-width: 100%;

  ${({ theme }) => theme.media.sm} {
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

/**
 * Clipped rather than `display: none` below `sm`: the label is what the button announces, and
 * removing it from the accessibility tree would leave a screen-reader user with a bare number.
 */
const StepLabel = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;

  ${({ theme }) => theme.media.sm} {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }
`;

const CurrentStep = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};

  ${({ theme }) => theme.media.sm} {
    display: none;
  }
`;

const StepButton = styled.button<{ $state: 'done' | 'current' | 'todo' }>`
  display: inline-flex;
  align-items: center;
  /* Positioning context for the clipped StepLabel, so it cannot escape and affect layout. */
  position: relative;
  gap: ${({ theme }) => theme.space[2]}px;
  min-height: 44px;
  padding: ${({ theme }) => `${theme.space[2]}px ${theme.space[3]}px`};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid
    ${({ theme, $state }) => ($state === 'todo' ? theme.color.line2 : theme.color.accentPrimary)};
  background: ${({ theme, $state }) =>
    $state === 'current' ? theme.color.accentPrimary : 'transparent'};
  color: ${({ theme, $state }) =>
    $state === 'current' ? theme.color.surfaceBase : theme.color.textPrimary};
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StepIndex = styled.span`
  display: inline-grid;
  place-items: center;
  inline-size: 20px;
  block-size: 20px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
`;

const Hidden = styled.span`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]}px;
  min-width: 0;
`;

const Footer = styled.div`
  display: flex;
`;
