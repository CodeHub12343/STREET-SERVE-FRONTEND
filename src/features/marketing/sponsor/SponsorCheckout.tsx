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
 *
 * **Reading is public; paying is not.** The page and this rate card are visible to anyone, because
 * a prospective sponsor has to be able to see what a placement costs before deciding whether to
 * make an account. The purchase itself needs a signed-in owner: `POST /sponsors/purchase` is
 * authenticated server-side, so without this guard an anonymous visitor filled the whole form,
 * pressed Continue, and got a bare 401 toast with no idea what to do about it. The guard sends
 * them to sign-up and back here instead.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import styled from 'styled-components';
import { Check, FileText, Image as ImageIcon, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments';
import { useAgreement, useAcceptAgreement } from '@/features/vendor/hooks/useAgreement';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { newIdempotencyKey } from '@/lib/idempotency';
import { uploadImage } from '@/lib/upload';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import { isAuthConfigured, isMapDemo } from '@/lib/env';
import { giveawayProgram, sponsorshipTiers } from '../content';

type SponsorProgram = 'platform' | 'ice_cream_giveaway';

interface Tier {
  slug: string;
  name: string;
  /** Platform tiers price per month; giveaway tiers quote a one-time `priceCents`. */
  monthlyCents?: number;
  priceCents?: number;
  /** Only present on giveaway tiers; `false` means Contact-us only, not purchasable here. */
  selfServe?: boolean;
  blurb: string;
}
interface RateCard {
  program: SponsorProgram;
  priceMode: 'monthly' | 'one_time';
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

export interface SponsorCheckoutProps {
  /** Which sponsorship program this checkout buys into. Omitted = platform (default). */
  program?: SponsorProgram;
  /** Where sign-up returns to, so a sponsor lands back on the page they were paying from. */
  returnTo?: string;
}

export function SponsorCheckout({ program = 'platform', returnTo = '/sponsor' }: SponsorCheckoutProps = {}) {
  const { show } = useToast();
  const router = useRouter();
  /**
   * `isLoaded` matters: Clerk reports `isSignedIn === false` while it is still resolving the
   * session, so guarding on that alone would bounce a signed-in sponsor to sign-up on a slow load.
   * When Clerk isn't configured at all (dev without keys) there is no session to check and the
   * guard stands down — the backend is still the thing that actually enforces this.
   */
  const { isLoaded, isSignedIn } = useAuthCompat();
  const mustSignIn = isAuthConfigured && isLoaded && !isSignedIn;

  /**
   * Fallback rate card built from the same static content the page already renders. Used when
   * the backend is unreachable (dev with no API running) or when demo mode is on. The page is
   * marketing material — a sponsor who lands here on a demo link shouldn't see "Couldn't load
   * sponsorship options" and bounce; they should see the tiers and be told the purchase step
   * needs a live backend.
   */
  const staticRateCard: RateCard =
    program === 'ice_cream_giveaway'
      ? {
          program,
          priceMode: 'one_time',
          termMonths: [3],
          tiers: giveawayProgram.packages
            /** The landing page shows all four cards (incl. Diamond with its Contact-us CTA),
             *  but the checkout rate card is self-serve only — see the backend `listTiers`. */
            .filter((p) => !('contactOnly' in p && p.contactOnly))
            .map((p) => ({
              slug: p.slug,
              name: p.name,
              priceCents: p.priceCents,
              selfServe: true,
              blurb: p.pitch,
            })),
        }
      : {
          program: 'platform',
          priceMode: 'monthly',
          termMonths: [1, 3, 6, 12],
          tiers: sponsorshipTiers.tiers.map((t) => ({
            slug: t.slug,
            name: t.name,
            /** `priceAnnual` on the landing content is in DOLLARS; the API uses cents/month. */
            monthlyCents: Math.round((t.priceAnnual * 100) / 12),
            blurb: t.kicker,
          })),
        };

  const { data: apiRateCard, isLoading, isError } = useQuery<RateCard>({
    queryKey: ['sponsor', 'tiers', program],
    queryFn: () =>
      api.get<RateCard>(
        /** Backend accepts `?program=` and defaults to platform; omitting keeps the old call site. */
        program === 'platform'
          ? endpoints.sponsorTiers
          : `${endpoints.sponsorTiers}?program=${encodeURIComponent(program)}`,
      ),
    staleTime: 5 * 60_000,
    /** Backend-less dev + explicit demo mode: short-circuit the fetch so the UI never 500s. */
    enabled: !isMapDemo,
    retry: false,
  });

  /**
   * Effective rate card: the API's answer when it's up, the static fallback when it's down.
   * The purchase mutation guards itself with `backendRequired` below so a static-mode render
   * doesn't open a payment flow that can't complete.
   */
  const effective: RateCard = isMapDemo ? staticRateCard : (apiRateCard ?? staticRateCard);
  const backendRequired = isMapDemo || isError || !apiRateCard;

  const [tier, setTier] = useState<string>('');
  const [months, setMonths] = useState(3);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  /**
   * `logoUrl` is the final value sent to the server. Either the sponsor uploaded a file (we store
   * the returned `publicUrl`) or they can still paste one — the paste field stays, because a
   * big-brand sponsor often has an approved CDN URL on hand and would rather point at it than
   * re-upload. Upload wins when both exist (`isUploading` disables the paste field).
   */
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  /** Non-null once the placement exists and the card is owed. Drives step 2. */
  const [awaitingPay, setAwaitingPay] = useState<PurchaseResult | null>(null);

  /**
   * Agreement step. The sponsorship agreement is loaded eagerly (same cache as every other
   * clickwrap) and must be accepted before Continue is enabled. Enforced on the server too — a
   * client that skipped the step still fails `assertAccepted('sponsorship')`.
   */
  const agreement = useAgreement('sponsorship', !mustSignIn);
  const acceptAgreement = useAcceptAgreement('sponsorship');
  const [agreed, setAgreed] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');

  const purchase = useMutation<PurchaseResult, unknown, void>({
    mutationFn: () =>
      api.post<PurchaseResult>(
        endpoints.sponsorPurchase,
        {
          name: name.trim(),
          tier,
          /**
           * For one-time programs (Great Ice Cream Giveaway) the server ignores this and uses
           * the tier's fixed term; sending it anyway keeps the request body shape stable.
           */
          termMonths: months,
          contactEmail: email.trim(),
          program,
          ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
        },
        { idempotencyKey: newIdempotencyKey() },
      ),
  });

  /**
   * Only block on the API when we don't already have a static fallback for this program. The
   * fallback covers both `ice_cream_giveaway` and `platform` paths, so in practice we never
   * block — we render the tiers immediately and let `backendRequired` govern whether purchase
   * can actually complete.
   */
  if (isLoading && !isMapDemo && !isError) {
    return (
      <Wrap>
        <Skeleton $h="320px" $radius={16} />
      </Wrap>
    );
  }

  const data: RateCard = effective;
  const selected = data.tiers.find((t) => t.slug === tier);
  /**
   * Mirror the server's branch: a one-time program quotes the package price straight; a monthly
   * program multiplies by the chosen term. Falls back to 0 so a tier with neither field (an
   * impossible mix) does not surface NaN in the button.
   */
  const totalCents = selected
    ? data.priceMode === 'one_time'
      ? (selected.priceCents ?? 0)
      : (selected.monthlyCents ?? 0) * months
    : 0;
  /**
   * Signature matches: a typed name must match a trimmed sponsor name field, case-insensitive.
   * Not meant as biometric authentication — it's an attestation step, same bar as the DocuSign
   * typed-signature pattern. The content hash + user id + server timestamp is what makes the
   * acceptance tamper-evident.
   */
  const signatureMatches =
    signatoryName.trim().length > 1 &&
    name.trim().length > 1 &&
    signatoryName.trim().toLowerCase() === name.trim().toLowerCase();
  const ready =
    Boolean(selected) &&
    name.trim().length > 1 &&
    /.+@.+\..+/.test(email.trim()) &&
    agreed &&
    signatureMatches;

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
            <TierPrice className="tnum">
              {formatCents(data.priceMode === 'one_time' ? (t.priceCents ?? 0) : (t.monthlyCents ?? 0))}
              <small>{data.priceMode === 'one_time' ? ' / 90 days' : '/month'}</small>
            </TierPrice>
            <TierBlurb>{t.blurb}</TierBlurb>
          </TierCard>
        ))}
      </Tiers>

      {/*
        The term chip picker only applies to the monthly program. For a one-time giveaway package
        the term is a property of the tier (90 days) — showing a chooser that cannot change the
        price would be a decoration, not a control.
      */}
      {data.priceMode === 'monthly' ? (
        <>
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
        </>
      ) : null}

      <Fields>
        <Input label="Your organisation" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <Input
          label="Contact email"
          type="email"
          hint="Where we send the receipt and let you know when it’s live."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {/*
          Upload-first. A silver-tier plumber doesn't have a hosted PNG URL on hand; the previous
          URL-paste field dropped them from the funnel. The paste field stays below as a fallback
          for sponsors who DO have a CDN URL — most of our Platinum/Diamond prospects will. If
          both are provided, the upload wins.
        */}
        <LogoField>
          <FieldLabel id="logo-label">Logo (optional)</FieldLabel>
          <HiddenFile
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const { url } = await uploadImage(file, 'business-logo');
                setLogoUrl(url);
                show('Logo uploaded', 'success');
              } catch (err) {
                show(err instanceof Error ? err.message : 'Logo upload failed', 'danger');
              } finally {
                setUploading(false);
                /** Reset so re-selecting the same file still fires `onChange`. */
                if (fileInput.current) fileInput.current.value = '';
              }
            }}
          />
          {logoUrl ? (
            <LogoPreviewRow>
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded user asset */}
              <LogoPreview src={logoUrl} alt="Your logo preview" />
              <LogoMeta>
                <span>Looking good. We’ll review this before it appears on the map.</span>
                <LogoClear
                  type="button"
                  onClick={() => setLogoUrl('')}
                  aria-label="Remove logo"
                >
                  <X size={14} /> Remove
                </LogoClear>
              </LogoMeta>
            </LogoPreviewRow>
          ) : (
            <LogoUploadRow>
              <LogoUploadButton
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>Uploading…</>
                ) : (
                  <>
                    <Upload size={16} aria-hidden /> Upload logo
                  </>
                )}
              </LogoUploadButton>
              <LogoHint>
                <ImageIcon size={13} aria-hidden /> PNG, JPG, or WebP · up to 8MB
              </LogoHint>
            </LogoUploadRow>
          )}
          <LogoOrPaste>
            or paste a direct URL instead:
          </LogoOrPaste>
          <Input
            label=""
            hint="If you already host your logo (brand site, CDN), paste its URL. Otherwise upload above."
            placeholder="https://…"
            value={logoUrl.startsWith('http') && !uploading ? logoUrl : ''}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={uploading}
          />
          <LogoFallback>
            Without a logo we’ll show your organisation name as a text lockup.
          </LogoFallback>
        </LogoField>
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

      {/*
        Said before the button, not after it: someone who is going to have to make an account
        should know that while they are still deciding, not at the moment they press pay.
      */}
      {mustSignIn ? (
        <SignInNote>
          You’ll be asked to sign in or create an account before paying — a sponsorship has an owner
          we can tell when it goes live, when it ends, and if we can’t run it.
        </SignInNote>
      ) : null}

      {backendRequired ? (
        <SignInNote>
          {isMapDemo
            ? 'Demo mode: the tiers are shown for preview but payments are disabled.'
            : "Our checkout is temporarily unavailable, so we can't take a payment right now. The tiers you see are current — please try again in a moment, or contact us to arrange the sponsorship manually."}
        </SignInNote>
      ) : null}

      <Button
        fullWidth
        disabled={!ready || backendRequired}
        loading={purchase.isPending}
        onClick={() => {
          /**
           * Backend-less render path: nothing to call. The notice above explains why, and the
           * button is disabled; this is a defensive guard in case a race arms the click handler.
           */
          if (backendRequired) {
            show(
              isMapDemo
                ? 'Payments are disabled in demo mode.'
                : "Checkout is temporarily unavailable — please try again shortly.",
              'warning',
            );
            return;
          }
          /**
           * The guard. Nothing is charged and no placement is created for a signed-out visitor —
           * we send them to sign-up with a return path and they come back to this form.
           */
          if (mustSignIn) {
            router.push(`/sign-up?redirect_url=${encodeURIComponent(returnTo)}`);
            return;
          }
          /**
           * Record the acceptance FIRST, then the purchase: the server-side gate on
           * `assertAccepted('sponsorship')` depends on this row existing. Attestation sends the
           * exact version + content hash the user viewed, so a stale copy in the client is
           * rejected server-side rather than silently accepted.
           */
          if (!agreement.data) {
            show('Agreement is still loading — try again in a moment.', 'warning');
            return;
          }
          acceptAgreement.mutate(
            { version: agreement.data.version, contentHash: agreement.data.contentHash },
            {
              onSuccess: () => {
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
                });
              },
              onError: (e) =>
                show(
                  e instanceof AppApiError
                    ? e.message
                    : 'Could not record your agreement — please try again.',
                  'danger',
                ),
            },
          );
        }}
      >
        {!selected
          ? 'Choose a tier'
          : mustSignIn
            ? `Sign up to continue — ${formatCents(totalCents)}`
            : !agreed || !signatureMatches
              ? 'Sign the agreement to continue'
              : `Continue — ${formatCents(totalCents)}`}
      </Button>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const SignInNote = styled.p`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
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

const LogoField = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const HiddenFile = styled.input`
  display: none;
`;

const LogoUploadRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const LogoUploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px dashed ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    border-color: ${({ theme }) => theme.color.accentPrimary};
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const LogoHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const LogoPreviewRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const LogoPreview = styled.img`
  max-width: 72px;
  max-height: 72px;
  object-fit: contain;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border-radius: ${({ theme }) => theme.radius.control}px;
  padding: 4px;
`;

const LogoMeta = styled.div`
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const LogoClear = styled.button`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const LogoOrPaste = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[2]}px;
`;

const LogoFallback = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const AgreementBox = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const AgreementHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-weight: 800;
  font-size: 14px;
`;

const AgreementVersion = styled.span`
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-weight: 600;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textSecondary};
  letter-spacing: 0.03em;
`;

const AgreementBody = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space[3]}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border-radius: ${({ theme }) => theme.radius.control}px;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textPrimary};
  white-space: pre-wrap;
  font-family: ${({ theme }) => theme.typography.fontBody};
  max-height: 240px;
  overflow-y: auto;
`;

const AgreementRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textPrimary};
  label {
    cursor: pointer;
  }
`;

const AgreementCheck = styled.input`
  margin-top: 3px;
  width: 16px;
  height: 16px;
  cursor: pointer;
`;
