'use client';

/**
 * The three ad surfaces (F-3): `map_banner`, `discovery_card`, `earn_slot`.
 *
 * Two invariants hold across all of them, and neither is configurable:
 *
 *  1. **Every ad carries its label.** `PromotedLabel` is rendered unconditionally from the server's
 *     `label` field. A paid result the user cannot tell apart from an organic one is the thing that
 *     makes a discovery feed worthless.
 *  2. **Ads never occupy more than their share of a feed.** The cap is enforced server-side from the
 *     `feedSize` each surface reports, so a caller passing a truthful organic count is what keeps
 *     the cap real. `AdSlot` renders whatever it is given and asks for no more.
 *
 * Rendering nothing is a first-class outcome: with no fill, every variant returns `null` rather
 * than a placeholder, so an unsold slot costs the layout nothing.
 */
import Link from 'next/link';
import styled, { css } from 'styled-components';
import { ExternalLink } from 'lucide-react';
import { useRecordAdClick } from '../hooks/useAds';
import type { AdPlacementSurface, ServedAd } from '../types';
import { PromotedLabel } from './PromotedLabel';

/**
 * An ad destination we are willing to put in an href: an in-app path, or an http(s) URL. Anything
 * else — `javascript:`, `data:`, `vbscript:`, a protocol-relative `//evil.com` — becomes null and
 * the ad renders as a plain, non-interactive card.
 */
function safeDestination(raw: string | null): string | null {
  if (!raw) return null;
  // `//evil.com` inherits the current scheme and leaves the site — an internal-looking escape.
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/')) return raw;
  try {
    const scheme = new URL(raw).protocol;
    return scheme === 'https:' || scheme === 'http:' ? raw : null;
  } catch {
    return null;
  }
}

interface AdSlotProps {
  ads: ServedAd[];
  surface: AdPlacementSurface;
  className?: string;
}

export function AdSlot({ ads, surface, className }: AdSlotProps) {
  const recordClick = useRecordAdClick();
  if (ads.length === 0) return null;

  return (
    <>
      {ads.map((ad) => (
        <AdUnit key={ad.placementId} ad={ad} surface={surface} className={className} onClick={recordClick} />
      ))}
    </>
  );
}

function AdUnit({
  ad,
  surface,
  className,
  onClick,
}: {
  ad: ServedAd;
  surface: AdPlacementSurface;
  className?: string;
  onClick: (id: string) => void;
}) {
  /**
   * Defence in depth on the destination.
   *
   * The server constrains `clickUrl` to http(s) or an internal path, and this refuses to render
   * anything else anyway. `javascript:` and `data:` hrefs are stored XSS when an ad written by one
   * advertiser is shown on a stranger's map, and the render site is the last place to stop it — a
   * guard only at the entry point protects only the entry points that exist today.
   */
  const destination = safeDestination(ad.clickUrl);
  const interactive = Boolean(destination);
  const content = (
    <>
      {ad.imageUrl ? <Thumb $surface={surface} style={{ backgroundImage: `url(${ad.imageUrl})` }} aria-hidden /> : null}
      <Copy>
        <TopRow>
          <PromotedLabel label={ad.label} />
          {/* Only for destinations that genuinely leave the app — an arrow on an internal
              route promises a new tab that never opens. */}
          {destination && !destination.startsWith('/') ? <ExternalLink size={12} aria-hidden /> : null}
        </TopRow>
        <Headline $surface={surface}>{ad.headline}</Headline>
        {ad.body ? <Body $surface={surface}>{ad.body}</Body> : null}
      </Copy>
    </>
  );

  if (!interactive) {
    return (
      <Unit as="div" $surface={surface} className={className}>
        {content}
      </Unit>
    );
  }

  /**
   * An ad can point at somewhere in this app (a business profile) or off it (an advertiser's own
   * site), and the two need different link behaviour.
   *
   * Internal destinations go through the Next router in the SAME tab: opening the app in a new tab
   * loses the user's place on the map, and `rel="nofollow sponsored"` on our own route is
   * meaningless. External ones keep the new tab and the sponsored rel, which is what those
   * attributes are actually for.
   */
  const internal = destination!.startsWith('/');

  if (internal) {
    return (
      <Unit
        as={Link}
        href={destination!}
        $surface={surface}
        className={className}
        onClick={() => onClick(ad.placementId)}
      >
        {content}
      </Unit>
    );
  }

  return (
    <Unit
      $surface={surface}
      className={className}
      href={destination ?? undefined}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      onClick={() => onClick(ad.placementId)}
    >
      {content}
    </Unit>
  );
}

/** Per-surface layout. The label placement is identical everywhere — it is not a per-surface choice. */
const surfaceStyles = {
  map_banner: css`
    flex-direction: row;
    align-items: center;
    gap: ${({ theme }) => theme.space[3]}px;
    padding: ${({ theme }) => theme.space[3]}px;
  `,
  discovery_card: css`
    flex-direction: column;
    gap: ${({ theme }) => theme.space[2]}px;
    padding: ${({ theme }) => theme.space[4]}px;
  `,
  earn_slot: css`
    flex-direction: row;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space[3]}px;
    padding: ${({ theme }) => theme.space[4]}px;
  `,
} as const;

const Unit = styled.a<{ $surface: AdPlacementSurface }>`
  display: flex;
  width: 100%;
  text-align: left;
  text-decoration: none;
  color: inherit;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  /* A dashed edge separates paid from organic at a glance, before anyone reads the label. */
  border: 1px dashed ${({ theme }) => theme.color.line2};
  ${({ $surface }) => surfaceStyles[$surface]}

  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;

const Thumb = styled.div<{ $surface: AdPlacementSurface }>`
  flex: none;
  background-size: cover;
  background-position: center;
  border-radius: ${({ theme }) => theme.radius.control}px;
  ${({ $surface }) =>
    $surface === 'discovery_card'
      ? css`
          width: 100%;
          height: 120px;
        `
      : css`
          width: 44px;
          height: 44px;
        `}
`;

const Copy = styled.div`
  display: grid;
  gap: 3px;
  min-width: 0;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const Headline = styled.p<{ $surface: AdPlacementSurface }>`
  font-size: ${({ $surface }) => ($surface === 'map_banner' ? 13 : 14)}px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Body = styled.p<{ $surface: AdPlacementSurface }>`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.textSecondary};
  display: -webkit-box;
  -webkit-line-clamp: ${({ $surface }) => ($surface === 'map_banner' ? 1 : 2)};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
