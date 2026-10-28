'use client';

/**
 * ═══ Public sponsor profile. ═══
 *
 * The "featured sponsor profile" line on the Gold / Platinum / Diamond / Launch / Founding rate
 * cards. The backend hard-gates visibility by tier — a Silver sponsor who set `website_url` and
 * `about` returns 404 here, deliberately, because that benefit wasn't bought.
 *
 * Visible to anyone (no auth). Impressions are recorded through the SAME counter as logo
 * placement — a view is a view — so the sponsor's dashboard shows one honest number instead of
 * two mutually-incomprehensible ones. Recorded best-effort on mount; a 429 does not break the
 * page render.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import styled from 'styled-components';
import { ExternalLink, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';

interface PublicProfile {
  name: string;
  logoUrl: string | null;
  tier: string;
  program: string;
  websiteUrl: string | null;
  about: string | null;
  utmCode: string;
  slug: string;
}

const PROGRAM_LABEL: Record<string, string> = {
  platform: 'StreetServe platform sponsor',
  ice_cream_giveaway: 'Great Ice Cream Giveaway sponsor',
};

export function SponsorProfilePage({ slug }: { slug: string }) {
  const { data, isLoading, isError, error } = useQuery<PublicProfile>({
    queryKey: ['sponsor', 'profile', slug],
    queryFn: () => api.get<PublicProfile>(endpoints.sponsorProfile(slug)),
    retry: false,
    staleTime: 60_000,
  });

  /**
   * Record an impression on view. Not awaited — the page should render whether or not the
   * counter write succeeded, and a 429 under load must not break the content.
   */
  useEffect(() => {
    if (!data?.utmCode) return;
    void api
      .post(endpoints.sponsorImpression, { utmCode: data.utmCode })
      .catch(() => {
        /** silent — see the comment above */
      });
  }, [data?.utmCode]);

  if (isLoading) {
    return (
      <Page>
        <Skeleton $h="320px" $radius={16} />
      </Page>
    );
  }
  if (isError) {
    /**
     * A 404 means either "no such sponsor" or "tier below profile threshold" — both are shown
     * identically on purpose: a profile that isn't published shouldn't advertise its own
     * existence (same reason the backend returned 404, not 403).
     */
    if (error instanceof AppApiError && error.status === 404) notFound();
    return (
      <Page>
        <ErrorBox>Couldn’t load this sponsor profile.</ErrorBox>
      </Page>
    );
  }
  if (!data) return null;

  return (
    <Page>
      <Head>
        <Logo>
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external sponsor logo
            <img src={data.logoUrl} alt={`${data.name} logo`} />
          ) : (
            <LogoFallback>{data.name}</LogoFallback>
          )}
        </Logo>
        <HeadMeta>
          <TierBadge>{data.tier.toUpperCase()}</TierBadge>
          <ProgramLine>
            <Megaphone size={14} aria-hidden />
            {PROGRAM_LABEL[data.program] ?? 'StreetServe sponsor'}
          </ProgramLine>
        </HeadMeta>
      </Head>

      <Name>{data.name}</Name>

      {data.about ? <About>{data.about}</About> : null}

      {data.websiteUrl ? (
        <WebsiteCta
          href={data.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit {new URL(data.websiteUrl).hostname.replace(/^www\./, '')}
          <ExternalLink size={15} aria-hidden />
        </WebsiteCta>
      ) : null}

      <Attribution>
        Thank you to {data.name} for supporting StreetServe. Signups that come through this
        sponsor&apos;s links help keep the live map free for customers.
      </Attribution>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Head = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 120px 1fr;
  align-items: center;
`;

const Logo = styled.div`
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[3]}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`;

const LogoFallback = styled.span`
  font-weight: 800;
  font-size: 14px;
  text-align: center;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const HeadMeta = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  justify-items: start;
`;

const TierBadge = styled.span`
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const ProgramLine = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Name = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const About = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textPrimary};
  white-space: pre-wrap;
`;

const WebsiteCta = styled.a`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  &:hover {
    filter: brightness(1.05);
  }
`;

const Attribution = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  font-size: 13.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const ErrorBox = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
`;
