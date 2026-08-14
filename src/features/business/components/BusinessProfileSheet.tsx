'use client';

/**
 * C-14 Business Profile Sheet (docs/13 C-14) — the surface every transaction starts from. One
 * status value drives five surfaces at once (header tint, status chip, location line, queue card
 * visibility, and the primary CTA), derived from a single source so they can never disagree.
 * Opens as a bottom sheet over the map (SheetStack). Ships loading / error / not-found states.
 *
 * BP-6: what the sheet offers comes from the business's resolved modules, not its category — a
 * barber leads with "Book", a food truck with "Order", a locksmith with "Wave them down", and a
 * barber never sees an empty Menu section. There is deliberately no per-category branching here;
 * see businessActions.ts.
 */
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styled, { keyframes } from 'styled-components';
import { Clock } from 'lucide-react';
import { Sheet } from '@/components/primitives/Sheet';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { resolveActions, resolveSections } from '../businessActions';
import { useBusinessModules } from '../hooks/useBusinessModules';
import { useBusiness, useMenu, useQueuePreview, useReviews, useServices } from '../hooks/useBusiness';
import { ActionRow } from './ActionRow';
import { BusinessHero } from './BusinessHero';
import { LiveQueueCard } from './LiveQueueCard';
import { MenuPreview } from './MenuPreview';
import { ServicesPreview } from './ServicesPreview';
import { ReviewsPreview } from './ReviewsPreview';
/**
 * Both community cards load on demand. The map route reaches its bundle budget through this sheet's
 * import graph, and neither card is on the first screen: one renders only for a business that has a
 * fund, the other only while a campaign is live. Static imports here took the map to 260.4 KB
 * against a 260 KB budget and failed the gate.
 */
const PayItForwardCard = dynamic(
  () => import('@/features/payforward').then((m) => m.PayItForwardCard),
  { ssr: false },
);
const BoostCampaignCard = dynamic(
  () => import('@/features/boost').then((m) => m.BoostCampaignCard),
  { ssr: false },
);

export function BusinessProfileSheet({
  businessId,
  open,
  onClose,
}: {
  businessId: string | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const { data: biz, isLoading, isError, refetch } = useBusiness(open ? businessId : undefined);
  const { data: modules } = useBusinessModules(open ? businessId : undefined);
  const { data: reviews = [] } = useReviews(open ? businessId : undefined);
  const { data: queue } = useQueuePreview(open && biz?.status !== 'away' ? businessId : undefined);

  const isAway = biz?.status === 'away';
  const sections = resolveSections(modules?.enabled);
  const actions = resolveActions(modules?.enabled);
  // Only fetch what this business actually has — a barber's profile makes no menu request.
  const { data: menu = [] } = useMenu(open && sections.menu ? businessId : undefined);
  const { data: services = [] } = useServices(open && sections.services ? businessId : undefined);

  // The plain profile endpoint may omit rating aggregates — derive them from the fetched reviews.
  const ratingValue =
    biz?.rating ??
    (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : undefined);
  const reviewCountValue = biz?.reviewCount ?? (reviews.length || undefined);

  // The CTAs ARE the business's capabilities, in priority order — no category anywhere.
  const [primary, secondary] = actions;
  const footer = biz ? (
    isAway || actions.length === 0 ? (
      <Button fullWidth variant="secondary" onClick={() => show('We’ll alert you next time they’re nearby', 'success')}>
        Notify Me
      </Button>
    ) : (
      <FooterRow>
        {secondary ? (
          <Button
            variant="secondary"
            onClick={() => router.push(`/business/${biz.id}/${secondary.path}`)}
          >
            {secondary.label}
          </Button>
        ) : null}
        {/* The primary action is the visual anchor of the takeover — larger, with an ambient sheen. */}
        <PrimaryCta>
          <Button fullWidth onClick={() => router.push(`/business/${biz.id}/${primary!.path}`)}>
            {primary!.label}
          </Button>
        </PrimaryCta>
      </FooterRow>
    )
  ) : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel={biz?.name ?? 'Business'}
      initialSnap="half"
      coverBleed
      footer={footer}
    >
      {isLoading || (!biz && !isError) ? (
        <Loading>
          <Skeleton $h="80px" $radius={16} />
          <Skeleton $w="60%" $h="24px" />
          <Skeleton $w="90%" />
          <Skeleton $w="80%" />
        </Loading>
      ) : isError || !biz ? (
        <ErrorState title="Couldn’t load this business" onRetry={() => void refetch()} />
      ) : (
        <Content>
          <BusinessHero
            biz={biz}
            rating={ratingValue}
            reviewCount={reviewCountValue}
            onClose={onClose}
          />

          <Body>
            {biz.locationLine ? <LocationLine>{biz.locationLine}</LocationLine> : null}

            <ActionRow businessId={biz.id} following={Boolean(biz.following)} lngLat={biz.lngLat} />

            {!isAway && sections.queue && queue ? <LiveQueueCard queue={queue} /> : null}

            {biz.todaysSpecial ? (
              <Special $dim={isAway}>
                <b>Today’s Special</b> · {biz.todaysSpecial}
              </Special>
            ) : null}

            {biz.about || biz.hours ? (
              <Section>
                <SectionTitle>About</SectionTitle>
                {biz.about ? <About>{biz.about}</About> : null}
                {biz.hours ? (
                  <Hours>
                    <Clock size={13} aria-hidden />
                    <span>{biz.hours}</span>
                  </Hours>
                ) : null}
              </Section>
            ) : null}

            {sections.services ? (
              <Section>
                <SectionTitle>Services</SectionTitle>
                <ServicesPreview services={services} />
              </Section>
            ) : null}

            {sections.menu ? (
              <Section>
                <SectionTitle>Menu</SectionTitle>
                <MenuPreview items={menu} />
              </Section>
            ) : null}

            {sections.payItForward ? (
              <Section>
                <PayItForwardCard businessId={biz.id} businessName={biz.name} />
              </Section>
            ) : null}

            {/* Renders only while a campaign is actually live — see BoostCampaignCard. */}
            <Section>
              <BoostCampaignCard businessId={biz.id} businessName={biz.name} />
            </Section>

            <Section>
              <SectionTitle>Reviews</SectionTitle>
              <ReviewsPreview rating={ratingValue} count={reviewCountValue} reviews={reviews} />
            </Section>
          </Body>
        </Content>
      )}
    </Sheet>
  );
}

const FooterRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  /* The primary CTA is the anchor: it takes the room, the secondary stays compact beside it. */
  > *:last-child {
    flex: 1;
  }
`;
const sheen = keyframes`
  0% { transform: translateX(-120%); }
  60%, 100% { transform: translateX(220%); }
`;
/** Ambient sheen sweeping across the primary CTA — the "come here" pull, calmed for reduced-motion. */
const PrimaryCta = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.control}px;
  overflow: hidden;
  box-shadow: 0 8px 24px ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 45%, transparent)`};
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
    animation: ${sheen} 3.4s ${({ theme }) => theme.motion.easeOut} infinite;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
      display: none;
    }
  }
`;
const Loading = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding-top: ${({ theme }) => theme.space[3]}px;
`;
const Content = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
`;
/** Everything below the full-bleed hero lives here so it keeps the content padding the hero escapes. */
const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const LocationLine = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Special = styled.p<{ $dim: boolean }>`
  font-size: 14px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusWarning} 12%, transparent)`};
  opacity: ${({ $dim }) => ($dim ? 0.6 : 1)};
  b {
    color: ${({ theme }) => theme.color.statusWarning};
  }
`;
const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const About = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Hours = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  svg {
    flex: none;
    margin-top: 2px;
  }
`;
