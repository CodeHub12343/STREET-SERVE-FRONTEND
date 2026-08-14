'use client';

/**
 * C-14 business hero (Concept D — Fullscreen Takeover). The cover image IS the entrance: a full-bleed
 * photo with a legibility scrim, the business identity floated over the bottom, glassy Close + Favorite
 * controls over the top, and a live status pill. When there's no cover we render a status-tinted
 * gradient so a photoless business still looks deliberate. Distance/ETA aren't in the profile contract,
 * so the meta line leads with what IS known (category + status). One status value tints the fallback.
 */
import styled, { keyframes } from 'styled-components';
import { X, Heart, Star, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/primitives/Avatar';
import { useToast } from '@/components/feedback/ToastProvider';
import type { PinStatus } from '@/components/map/MapPin';
import { useFollow } from '../hooks/useBusiness';
import type { BusinessProfile } from '../types';

const STATUS_LABEL: Record<string, string> = {
  driving: 'On the move',
  parked: 'Parked & open',
  away: 'Closed',
};

export function BusinessHero({
  biz,
  rating,
  reviewCount,
  onClose,
}: {
  biz: BusinessProfile;
  rating?: number;
  reviewCount?: number;
  onClose: () => void;
}) {
  const { show } = useToast();
  const follow = useFollow(biz.id);
  const following = Boolean(biz.following);
  const status = (biz.status ?? 'parked') as PinStatus;
  // No dedicated cover photo? Fill the cover with the business's own image (its logo/avatar) rather
  // than an empty gradient — the gradient stays only as the last-resort backdrop for a business with
  // no imagery at all.
  const coverSrc = biz.coverUrl ?? biz.logoUrl;

  return (
    <Hero $status={status}>
      {coverSrc ? <Cover src={coverSrc} alt="" /> : null}
      <Scrim />

      <TopControls>
        <Glass
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </Glass>
        <Glass
          type="button"
          aria-label={following ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={following}
          $active={following}
          onClick={() =>
            follow.mutate(following, {
              onSuccess: () =>
                show(following ? 'Removed from Favorites' : 'Saved — find them in Favorites', 'success'),
              onError: () => show('Couldn’t update. Please try again.', 'danger'),
            })
          }
        >
          <Heart size={20} fill={following ? 'currentColor' : 'none'} />
        </Glass>
      </TopControls>

      <Identity>
        <Avatar name={biz.name} src={biz.logoUrl} size={56} />
        <IdText>
          <h2>{biz.name}</h2>
          <MetaRow>
            <StatusPill $status={status}>
              <StatusDot $status={status} aria-hidden />
              {STATUS_LABEL[status] ?? 'Open'}
            </StatusPill>
            {rating !== undefined ? (
              <Meta>
                <Star size={13} fill="currentColor" />
                <b className="tnum">{rating.toFixed(1)}</b>
                {reviewCount ? <span>({reviewCount})</span> : null}
              </Meta>
            ) : (
              <Meta>New</Meta>
            )}
            {typeof biz.trustScore === 'number' ? (
              <Meta>
                <ShieldCheck size={13} />
                {biz.trustScore}
              </Meta>
            ) : null}
          </MetaRow>
        </IdText>
      </Identity>
    </Hero>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(1.04); }
  to { opacity: 1; transform: scale(1); }
`;

/**
 * Bleed past the sheet's content padding (space[5] sides, space[2] top) to reach the panel edges.
 * With the sheet in `coverBleed` mode the drag handle overlays the image, so the cover runs all the
 * way to the panel's top — no white strip above it.
 */
const Hero = styled.div<{ $status: PinStatus | string }>`
  position: relative;
  margin: ${({ theme }) => -theme.space[2]}px ${({ theme }) => -theme.space[5]}px 0;
  height: 200px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  isolation: isolate;
  background: ${({ theme, $status }) => {
    const c =
      $status === 'driving'
        ? theme.color.statusDriving
        : $status === 'away'
          ? theme.color.statusAway
          : theme.color.statusParked;
    return `linear-gradient(135deg, color-mix(in srgb, ${c} 42%, ${theme.color.surfaceRaised}) 0%, color-mix(in srgb, ${theme.color.accentPrimary} 34%, ${theme.color.surfaceRaised}) 100%)`;
  }};
`;
const Cover = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Bias slightly toward the top so a square logo/headshot used as a wide cover keeps its subject. */
  object-position: center 35%;
  animation: ${fadeIn} ${({ theme }) => theme.motion.sheet}ms ${({ theme }) => theme.motion.easeOut};
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0) 32%, rgba(0, 0, 0, 0.62) 100%);
`;
const TopControls = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space[3]}px;
  left: ${({ theme }) => theme.space[4]}px;
  right: ${({ theme }) => theme.space[4]}px;
  display: flex;
  justify-content: space-between;
  z-index: 1;
`;
const Glass = styled.button<{ $active?: boolean }>`
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? '#FF5A7A' : '#fff')};
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform ${({ theme }) => theme.motion.micro}ms ${({ theme }) => theme.motion.easeOut};
  &:active {
    transform: scale(0.9);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Identity = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  width: 100%;
`;
const IdText = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;
  padding-bottom: 4px;
  h2 {
    font-size: 24px;
    line-height: 1.1;
    color: #fff;
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);
  }
`;
const MetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Meta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
  b {
    font-weight: 800;
  }
  span {
    font-weight: 600;
    opacity: 0.85;
  }
`;
const StatusPill = styled.span<{ $status: PinStatus | string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`;
const StatusDot = styled.span<{ $status: PinStatus | string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme, $status }) =>
    $status === 'driving'
      ? theme.color.statusDriving
      : $status === 'away'
        ? theme.color.statusAway
        : theme.color.statusParked};
`;
