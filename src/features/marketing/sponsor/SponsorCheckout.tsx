'use client';

/**
 * ═══ Buy a sponsorship. ═══
 *
 * Until now a sponsor could not sponsor StreetServe at all: the whole feature was admin
 * record-keeping for a deal closed by email, and the landing page's "Partner with us" CTA was a
 * `mailto:`. This is the first surface where someone can actually become a sponsor.
 *
 * Three things the copy has to be honest about, because each one is a promise:
 *
 *  1. **Paying does not publish the logo.** A person checks every image first — anyone with a card
 *     could otherwise put an arbitrary picture on the landing page. Said BEFORE payment, not
 *     discovered afterwards when the logo does not appear.
 *  2. **A refusal is refunded in full.** That is what makes the review step fair rather than a way
 *     of keeping money for nothing.
 *  3. **The term is fixed and it ends.** No auto-renewal, no recurring charge — one payment, one
 *     term, and the placement comes down when it runs out.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import { Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { newIdempotencyKey } from '@/lib/idempotency';

interface Tier {
  slug: string;
  name: string;
  monthlyCents: number;
  blurb: string;
}
interface RateCard {
  tiers: Tier[];
  termMonths: number[];
}
interface PurchaseResult {
  id: string;
  name: string;
  amountCents: number;
  termMonths: number;
  clientSecret: string | null;
  status: 'pending_payment';
}

export function SponsorCheckout() {
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<RateCard>({
    queryKey: ['sponsor', 'tiers'],
    queryFn: () => api.get<RateCard>(endpoints.sponsorTiers),
    staleTime: 5 * 60_000,
  });

  const [tier, setTier] = useState<string>('');
  const [months, setMonths] = useState(3);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  /** Non-null once the placement exists and the card is owed. Drives step 2. */
  const [awaitingPay, setAwaitingPay] = useState<PurchaseResult | null>(null);

  const purchase = useMutation<PurchaseResult, unknown, void>({
    mutationFn: () =>
      api.post<PurchaseResult>(
        endpoints.sponsorPurchase,
        {
          name: name.trim(),
          tier,
          termMonths: months,
          contactEmail: email.trim(),
          ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
        },
        { idempotencyKey: newIdempotencyKey() },
      ),
  });

  if (isLoading) return <Wrap><Skeleton $h="320px" $radius={16} /></Wrap>;
  if (isError || !data) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load sponsorship options" onRetry={() => void refetch()} />
      </Wrap>
    );
  }

  const selected = data.tiers.find((t) => t.slug === tier);
  const totalCents = selected ? selected.monthlyCents * months : 0;
  const ready = Boolean(selected) && name.trim().length > 1 && /.+@.+\..+/.test(email.trim());

  /**
   * Step 2 — pay. The wording promises the payment and the REVIEW, never the placement: the logo
   * goes up when a person has approved it, and the webhook is what tells us the money arrived.
   */
  if (awaitingPay) {
    return (
      <Wrap>
        <H1>Pay {formatCents(awaitingPay.amountCents)}</H1>
        <Lede>
          {awaitingPay.name} · {awaitingPay.termMonths}{' '}
          {awaitingPay.termMonths === 1 ? 'month' : 'months'}
        </Lede>
        <PaymentSheet
          clientSecret={awaitingPay.clientSecret ?? 'demo'}
          amountCents={awaitingPay.amountCents}
          onSuccess={() => {
            show('Payment received — we’ll review your logo and email you when it’s live', 'success');
            setAwaitingPay(null);
          }}
        />
        <Reassure>
          <ShieldCheck size={16} aria-hidden />
          <span>
            We check every logo by hand before it appears, so this won’t go live immediately. If we
            can’t run it, you’re refunded in full.
          </span>
        </Reassure>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <H1>Sponsor StreetServe</H1>
      <Lede>
        Your logo on the landing page, and a link that credits you with every person who signs up
        through it.
      </Lede>

      <Tiers role="radiogroup" aria-label="Sponsorship tier">
        {data.tiers.map((t) => (
          <TierCard
            key={t.slug}
            type="button"
            role="radio"
            aria-checked={tier === t.slug}
            $selected={tier === t.slug}
            onClick={() => setTier(t.slug)}
          >
            <TierHead>
              <TierName>{t.name}</TierName>
              {tier === t.slug ? <Check size={16} aria-hidden /> : null}
            </TierHead>
            <TierPrice className="tnum">{formatCents(t.monthlyCents)}<small>/month</small></TierPrice>
            <TierBlurb>{t.blurb}</TierBlurb>
          </TierCard>
        ))}
      </Tiers>

      <FieldLabel id="term-label">Term</FieldLabel>
      <Terms role="radiogroup" aria-labelledby="term-label">
        {data.termMonths.map((m) => (
          <TermChip
            key={m}
            type="button"
            role="radio"
            aria-checked={months === m}
            $selected={months === m}
            onClick={() => setMonths(m)}
          >
            {m} {m === 1 ? 'month' : 'months'}
          </TermChip>
        ))}
      </Terms>

      <Fields>
        <Input label="Your organisation" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <Input
          label="Contact email"
          type="email"
          hint="Where we send the receipt and let you know when it’s live."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Logo URL (optional)"
          hint="A direct link to your logo. Without one we show your name as a text lockup."
          placeholder="https://…"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
      </Fields>

      {/*
        The review step, disclosed BEFORE payment. A sponsor who only learns their logo needs
        approval when it fails to appear has been misled by ordering.
      */}
      <Reassure>
        <ShieldCheck size={16} aria-hidden />
        <span>
          Every logo is checked by a person before it goes live, so it won’t appear the moment you
          pay. If we can’t run it, you’re refunded in full. One payment for the term you choose —
          there’s no recurring charge and it doesn’t auto-renew.
        </span>
      </Reassure>

      <Button
        fullWidth
        disabled={!ready}
        loading={purchase.isPending}
        onClick={() =>
          purchase.mutate(undefined, {
            onSuccess: (res) => {
              if (!res.clientSecret) {
                show(
                  'We couldn’t start the payment. Nothing has been charged — please try again.',
                  'warning',
                );
                return;
              }
              setAwaitingPay(res);
            },
            onError: (e) =>
              show(
                e instanceof AppApiError ? e.message : 'Could not start your sponsorship',
                'danger',
              ),
          })
        }
      >
        {selected ? `Continue — ${formatCents(totalCents)}` : 'Choose a tier'}
      </Button>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 560px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
`;
const H1 = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const Lede = styled.p`
  font-size: 15px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: -${({ theme }) => theme.space[2]}px;
`;
const Tiers = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const TierCard = styled.button<{ $selected: boolean }>`
  display: grid;
  gap: 4px;
  text-align: left;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.surfaceRaised2 : theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $selected }) => ($selected ? theme.color.accentPrimary : theme.color.line)};
`;
const TierHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
  svg {
    color: ${({ theme }) => theme.color.accentPrimary};
  }
`;
const TierName = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const TierPrice = styled.p`
  font-size: 22px;
  font-weight: 800;
  small {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const TierBlurb = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const FieldLabel = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Terms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: -${({ theme }) => theme.space[2]}px;
`;
const TermChip = styled.button<{ $selected: boolean }>`
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.accentPrimary : theme.color.surfaceRaised};
  color: ${({ theme, $selected }) => ($selected ? '#fff' : theme.color.textPrimary)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? 'transparent' : theme.color.line)};
`;
const Fields = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Reassure = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  svg {
    flex: none;
    margin-top: 1px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
