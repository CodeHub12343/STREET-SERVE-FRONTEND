'use client';

/**
 * Partners & sponsors (Section Breakdown §10).
 *
 * **LP-4, finally wired.** The section header said "LP-4 wires GET /sponsors" and it never did: the
 * lead partner was a hardcoded text lockup, `GET /sponsors` was called by nothing, and
 * `POST /sponsors/impression` was called by nothing — so a sponsor's logo could not appear and an
 * impression could not be counted. The admin report showed zero because zero had genuinely
 * happened, not because nobody had looked.
 *
 * Two deliberate choices:
 *
 *  • **An impression means the logos were actually on screen.** Recorded once per sponsor per page
 *    view, on intersection — counting a "view" for something rendered below the fold and never
 *    scrolled to would inflate the only number a sponsor is buying.
 *  • **A sponsor with no logo asset renders as a text lockup**, exactly as the lead partner did.
 *    The name is real either way; the image is the part that waits on permissions (D3).
 */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { partners } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

interface PublicSponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  tier: string;
  /** What the impression endpoint keys on — the `?utm=` in their own public links. */
  utmCode: string;
}

export function PartnersSection() {
  const { data } = useQuery<PublicSponsor[]>({
    queryKey: ['public', 'sponsors'],
    queryFn: () => api.get<PublicSponsor[]>(endpoints.sponsors),
    staleTime: 5 * 60_000,
    // A landing page must render with or without this; a failed fetch shows the fallback lockup.
    retry: 1,
  });
  const row = useRef<HTMLDivElement | null>(null);
  const counted = useRef(false);

  /**
   * Count the view once the logos are actually on screen. Fire-and-forget: a sponsor metric must
   * never delay or break the landing page, and a failed count is worth less than a broken hero.
   */
  useEffect(() => {
    const node = row.current;
    if (!node || counted.current || !data?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || counted.current) return;
        counted.current = true;
        io.disconnect();
        for (const s of data) {
          void api.post(endpoints.sponsorImpression, { utmCode: s.utmCode }).catch(() => undefined);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [data]);

  const sponsors = data ?? [];

  return (
    <SectionShell id="partners" eyebrow={partners.eyebrow} title={partners.title} align="center">
      <Reveal>
        <LogoRow ref={row}>
          {sponsors.length === 0 ? (
            /* No sponsors yet — the lead partner lockup, as before. Never an empty band. */
            <Lockup>
              <LockupName>Wonder Ice</LockupName>
              <LockupRole>National launch partner</LockupRole>
            </Lockup>
          ) : (
            sponsors.map((s) =>
              s.logoUrl ? (
                <LogoMark key={s.id}>
                  <img src={s.logoUrl} alt={s.name} loading="lazy" />
                </LogoMark>
              ) : (
                <Lockup key={s.id}>
                  <LockupName>{s.name}</LockupName>
                  <LockupRole>{s.tier === 'launch' ? 'Launch partner' : s.tier}</LockupRole>
                </Lockup>
              ),
            )
          )}
        </LogoRow>
        <CtaRow>
          <SponsorLink href={partners.cta.href}>{partners.cta.label} →</SponsorLink>
        </CtaRow>
      </Reveal>
    </SectionShell>
  );
}

const LogoMark = styled.div`
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  img {
    max-height: 44px;
    max-width: 160px;
    object-fit: contain;
  }
`;

const LogoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space[5]}px;
`;

const Lockup = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[6]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  text-align: center;
`;

const LockupName = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const LockupRole = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const CtaRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.space[6]}px;
`;

const SponsorLink = styled.a`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
