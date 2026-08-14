'use client';

/**
 * Buy a promotion (M-7 / RV-11, spec §32).
 *
 * Two pricing models, one screen. **Flat tiers lead** — $5 for a day, $15 for a week, $40 for a
 * month — because a street vendor deciding whether to spend $5 today cannot price a CPM campaign,
 * and pricing someone cannot reason about is pricing they do not buy. CPM stays available for
 * anyone who wants to buy volume rather than time.
 *
 * The §32 disclosure is shown before the purchase button, not after, and it is the server's copy
 * rather than ours — a promise about what promotion does is not something a client should author.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Check, Megaphone } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TextArea } from '@/components/primitives/TextArea';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useAdPricing, useCreateCampaign, useCreateFeatured } from '../hooks/useAds';
import type { AdPlacementSurface, CreatedPlacement } from '../types';

/**
 * Where each surface ACTUALLY renders.
 *
 * Every one of these has been wrong at least once, and each time the symptom was identical: a
 * vendor pays, goes to the named screen, sees nothing, and reasonably concludes the product is
 * broken. The ad was serving correctly the whole time.
 *
 *  • `map_banner` said "across the top of the live map". It renders inside the nearby-businesses
 *    sheet at the BOTTOM of the map (`DiscoverySheet`).
 *  • `earn_slot` said "the earn and jobs screens". There is no ad slot on the Jobs screen at all —
 *    only `EarnHub` (`/seller/earn`) renders it.
 *  • `discovery_card` said "browse and search lists", plural. One list renders it: `NearbyList`
 *    at `/map/list`.
 *
 * **The rule: this table describes where `<AdSlot>` is mounted, not where it would be nice to
 * advertise.** If a surface should reach further, mount the slot there and then change this line —
 * never the other way round. Grep `surface="…"` to check.
 */
const SURFACE_COPY: Record<AdPlacementSurface, { label: string; where: string }> = {
  map_banner: { label: 'On the map', where: 'In the nearby list at the bottom of the map' },
  discovery_card: { label: 'Discovery card', where: 'In the full nearby list' },
  earn_slot: { label: 'Earn slot', where: 'On the Earn hub, where sellers pick up work' },
};

export type PromoteSubject =
  | { kind: 'featured_product'; subjectId: string; name: string }
  | { kind: 'featured_hub'; subjectId: string; name: string }
  | { kind: 'ad'; businessId?: string };

export function PromoteFlow({ subject, backHref }: { subject: PromoteSubject; backHref?: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: pricing, isLoading } = useAdPricing();
  const businessId = subject.kind === 'ad' ? subject.businessId : undefined;
  const createFeatured = useCreateFeatured(businessId);
  const createCampaign = useCreateCampaign(businessId);

  const [tierDays, setTierDays] = useState<number | null>(7);
  const [budgetStr, setBudgetStr] = useState('');
  const [surface, setSurface] = useState<AdPlacementSurface>('discovery_card');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  /** Optional destination. Empty means "my profile" — see the hint under the field. */
  const [clickUrl, setClickUrl] = useState('');

  /**
   * The created-but-unpaid placement, held so its client secret can be handed to the card form.
   *
   * This is the whole fix: the server has always opened a PaymentIntent and returned its secret,
   * and this screen used to throw it away and redirect — leaving every promotion stranded at
   * "Awaiting payment" with no way in the product to pay for it.
   */
  const [awaitingPay, setAwaitingPay] = useState<CreatedPlacement | null>(null);

  const pending = createFeatured.isPending || createCampaign.isPending;
  const budgetCents = Math.round(Number(budgetStr.replace(/[^0-9.]/g, '')) * 100);
  const usingTier = tierDays !== null;
  /**
   * Only http(s) is accepted, and the server enforces the same thing. A `javascript:` destination
   * on an ad shown to strangers is stored XSS, so it is refused here too rather than only rejected
   * after they have filled the rest of the form.
   */
  const trimmedUrl = clickUrl.trim();
  const urlLooksValid =
    trimmedUrl === '' || /^https?:\/\/\S+$/i.test(trimmedUrl);

  const canSubmit =
    (usingTier || budgetCents > 0) &&
    (subject.kind !== 'ad' || headline.trim().length >= 2) &&
    urlLooksValid;

  const leave = () => router.replace(backHref ?? '/vendor/ads');

  const onDone = (res: CreatedPlacement) => {
    if (!res.awaitingPayment) {
      // Nothing to charge (or already settled) — don't show a card form for a paid promotion.
      show('Promotion is live.', 'success');
      leave();
      return;
    }

    if (!res.clientSecret) {
      /**
       * Created, needs paying, but the server gave us no secret to pay with. Rare, and the honest
       * response is to say so and point at the dashboard — where "Pay now" can re-open the charge —
       * rather than claim success and strand them again.
       */
      show('Promotion created, but we could not start the payment. Try “Pay now” on the ads page.', 'warning');
      leave();
      return;
    }

    setAwaitingPay(res);
  };

  /**
   * The card was accepted. **Not the same as being live.**
   *
   * A placement only starts delivering when Stripe's webhook reaches the server
   * (`activateByPaymentIntent`) — the client is never trusted to report that money arrived. So the
   * wording promises payment, not delivery, and the list is invalidated so the card flips from
   * "Awaiting payment" to "Live" on its own once the webhook lands.
   */
  const onPaid = () => {
    show('Payment received — your promotion goes live in a moment.', 'success');
    leave();
  };

  const onError = (e: unknown) =>
    show(e instanceof AppApiError ? e.message : 'Could not create the promotion', 'danger');

  const submit = () => {
    const price = usingTier ? { tierDays: tierDays } : { budgetCents };
    if (subject.kind === 'ad') {
      createCampaign.mutate(
        {
          placement: surface,
          headline: headline.trim(),
          body: body.trim() || undefined,
          ...(trimmedUrl ? { clickUrl: trimmedUrl } : {}),
          ...(businessId ? { businessId } : {}),
          ...price,
        },
        { onSuccess: onDone, onError },
      );
      return;
    }
    createFeatured.mutate(
      { kind: subject.kind, subjectId: subject.subjectId, ...price },
      { onSuccess: onDone, onError },
    );
  };

  const selectedPrice = usingTier
    ? pricing?.tiers.find((t) => t.days === tierDays)?.priceCents
    : budgetCents;

  /**
   * Step 2 — pay.
   *
   * `PaymentSheet` owns its own submit button and its own money-safety states (processing, decline,
   * "nothing was taken"), so this step passes no footer rather than adding a second button that
   * would compete with it.
   */
  if (awaitingPay) {
    return (
      <WizardFlow totalSteps={2} currentStep={2} onBack={leave}>
        <Head>
          <Megaphone size={22} aria-hidden />
          <div>
            <h1>Pay for your promotion</h1>
            <p>Your promotion is created. It starts running once this payment goes through.</p>
          </div>
        </Head>

        <Summary>
          <SummaryRow>
            <span>{awaitingPay.label}</span>
            <strong className="tnum">{formatCents(awaitingPay.budgetCents)}</strong>
          </SummaryRow>
          <SummaryNote>{awaitingPay.deliveryLabel}</SummaryNote>
        </Summary>

        <PaymentSheet
          clientSecret={awaitingPay.clientSecret ?? 'demo'}
          amountCents={awaitingPay.budgetCents}
          onSuccess={onPaid}
        />

        {/*
          Leaving is not losing the promotion — it stays on the ads page and can be paid there. Say
          so, or someone mid-doubt will assume closing the tab cancelled it.
        */}
        <Hint>
          Not ready? Your promotion is saved. You can pay for it any time from the ads page — it
          will not run until you do, and nothing has been charged yet.
        </Hint>
      </WizardFlow>
    );
  }

  return (
    <WizardFlow
      totalSteps={2}
      currentStep={1}
      onBack={() => router.back()}
      footer={
        <Button fullWidth loading={pending} disabled={!canSubmit || isLoading} onClick={submit}>
          {selectedPrice ? `Continue — ${formatCents(selectedPrice)}` : 'Continue'}
        </Button>
      }
    >
      <Head>
        <Megaphone size={22} aria-hidden />
        <div>
          <h1>{subject.kind === 'ad' ? 'Run an ad' : `Promote ${subject.name}`}</h1>
          <p>Get seen more often by people nearby.</p>
        </div>
      </Head>

      {isLoading || !pricing ? (
        <Skeleton $h="220px" $radius={16} />
      ) : (
        <>
          {subject.kind === 'ad' ? (
            <Section>
              <Select
                label="Where it appears"
                value={surface}
                onChange={(e) => setSurface(e.target.value as AdPlacementSurface)}
                options={(Object.keys(SURFACE_COPY) as AdPlacementSurface[]).map((s) => ({
                  value: s,
                  label: `${SURFACE_COPY[s].label} — ${SURFACE_COPY[s].where}`,
                }))}
              />
              <Input
                label="Headline"
                value={headline}
                maxLength={80}
                placeholder="e.g. Fresh birria, corner of 9th till 8pm"
                onChange={(e) => setHeadline(e.target.value)}
              />
              <TextArea
                label="Details (optional)"
                value={body}
                maxLength={200}
                onChange={(e) => setBody(e.target.value)}
              />
              <div>
                <Input
                  label="Link (optional)"
                  value={clickUrl}
                  maxLength={2048}
                  inputMode="url"
                  placeholder="https://your-website.com"
                  onChange={(e) => setClickUrl(e.target.value)}
                  error={urlLooksValid ? undefined : 'Enter a full web address starting with https://'}
                />
                {/* The default is the useful one, so say what it is rather than leaving them to guess. */}
                <Hint>Leave empty to send people to your business profile.</Hint>
              </div>
            </Section>
          ) : null}

          <Section>
            <Legend>How long</Legend>
            <Tiers role="radiogroup" aria-label="Promotion length">
              {pricing.tiers.map((t) => (
                <Tier
                  key={t.days}
                  type="button"
                  role="radio"
                  aria-checked={tierDays === t.days}
                  $on={tierDays === t.days}
                  onClick={() => setTierDays(t.days)}
                >
                  <TierName>{t.label}</TierName>
                  <TierPrice className="tnum">{t.priceLabel}</TierPrice>
                  {tierDays === t.days ? <Check size={14} aria-hidden /> : null}
                </Tier>
              ))}
            </Tiers>

            <CustomToggle
              type="button"
              aria-pressed={!usingTier}
              onClick={() => setTierDays(usingTier ? null : 7)}
            >
              {usingTier ? 'Set my own budget instead' : 'Use a fixed length instead'}
            </CustomToggle>

            {!usingTier ? (
              <>
                <Input
                  label="Budget"
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                />
                <Hint>
                  Charged per thousand views —{' '}
                  {pricing.cpm.find((c) => c.placement === surface)?.cpmLabel ?? ''}. It runs until
                  the budget is used up.
                </Hint>
              </>
            ) : null}
          </Section>

          {/* §32's disclosure, in the server's words. Shown before the purchase, never after. */}
          <Disclosure>{pricing.disclosure}</Disclosure>
        </>
      )}
    </WizardFlow>
  );
}

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.accentPrimary};
    margin-top: 2px;
  }
  h1 {
    font-size: 20px;
  }
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Legend = styled.h2`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Tiers = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Tier = styled.button<{ $on: boolean }>`
  display: grid;
  gap: 2px;
  justify-items: center;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[2]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $on }) => ($on ? theme.color.accentPrimary : theme.color.line2)};
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
  svg {
    color: ${({ theme }) => theme.color.accentPrimary};
  }
`;

const TierName = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const TierPrice = styled.span`
  font-size: 17px;
  font-weight: 800;
`;

const CustomToggle = styled.button`
  justify-self: start;
  background: none;
  border: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
  cursor: pointer;
  text-decoration: underline;
`;

const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Summary = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 14px;
  strong {
    font-size: 18px;
    font-weight: 800;
  }
`;

const SummaryNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Disclosure = styled.p`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
