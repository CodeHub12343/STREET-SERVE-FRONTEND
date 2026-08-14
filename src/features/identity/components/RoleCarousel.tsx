'use client';

/**
 * RoleCarousel — the profile page's signature interaction (the "Role Carousel Header" concept):
 * every identity the account can wear is a tile in a horizontal snap carousel. The active role is
 * elevated with an accent ring and an ACTIVE badge; neighbors peek from the edge so multiple
 * identities are visible without being told. Page dots track the centered tile.
 *
 * Tapping another role opens a preview sheet (its three value-proposition bullets) with one CTA:
 * "Switch to X" when the role is held (switches instantly and lands on that mode's home), or
 * "Become a X" when it isn't (enters the add-role flow). Privileged modes never advertise
 * themselves (SELF_GRANTABLE_MODES).
 *
 * Scales by construction: a future mode is one entry in MODE_META — one more tile, one more dot.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ChevronRight, Check } from 'lucide-react';
import { Sheet } from '@/components/primitives/Sheet';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { useMe } from '@/lib/auth/useMe';
import { useModeStore } from '@/stores/mode.store';
import { AppApiError } from '@/lib/api/errors';
import type { AppMode } from '@/types';
import { useAddRole } from '../hooks/useProfile';
import { useActiveMode } from '../hooks/useActiveMode';
import { ALL_MODES, MODE_META, SELF_GRANTABLE_MODES, holdsMode } from '../modes';

export function RoleCarousel() {
  const router = useRouter();
  const { show } = useToast();
  const { roles } = useMe();
  const addRole = useAddRole();
  const activeMode = useActiveMode();
  const setMode = useModeStore((s) => s.setMode);
  const deckRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState(0);
  const [preview, setPreview] = useState<AppMode | null>(null);

  // Show a mode you hold, or one you're allowed to add. Never offer a privileged role.
  const visibleModes = ALL_MODES.filter((m) => holdsMode(roles, m) || SELF_GRANTABLE_MODES.includes(m));

  /** The dot follows whichever tile is nearest the carousel's center. */
  const onScroll = () => {
    const deck = deckRef.current;
    if (!deck) return;
    const mid = deck.scrollLeft + deck.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    Array.from(deck.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(center - mid);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setDot(nearest);
  };

  const confirm = (mode: AppMode) => {
    // Already have it → just switch and go to that mode's home.
    if (holdsMode(roles, mode)) {
      setPreview(null);
      setMode(mode);
      router.push(MODE_META[mode].home);
      return;
    }
    // Don't have it → self-grant the backing role in one tap, then land on its home. (Previously
    // this dumped every role into the generic onboarding step, which can only grant seller/vendor —
    // so "Become a Consignment Hub" silently left you a Customer.)
    const role = MODE_META[mode].roles[0]!;
    addRole.mutate(role, {
      onSuccess: () => {
        setPreview(null);
        setMode(mode);
        router.push(MODE_META[mode].home);
        show(`You're now set up as ${MODE_META[mode].label}`, 'success');
      },
      onError: (e) =>
        show(e instanceof AppApiError ? e.message : 'Could not add that role', 'danger'),
    });
  };

  const previewMeta = preview ? MODE_META[preview] : null;
  const PreviewIcon = previewMeta?.icon;

  return (
    <Section aria-label="Account roles">
      <Deck ref={deckRef} onScroll={onScroll}>
        {visibleModes.map((mode) => {
          const meta = MODE_META[mode];
          const active = mode === activeMode;
          const Icon = meta.icon;
          return (
            <Tile
              key={mode}
              type="button"
              aria-pressed={active}
              $active={active}
              onClick={() => (active ? undefined : setPreview(mode))}
            >
              <Bubble $active={active}>
                <Icon size={22} aria-hidden />
              </Bubble>
              <TileName>{meta.label}</TileName>
              {active ? <ActiveBadge>ACTIVE</ActiveBadge> : null}
            </Tile>
          );
        })}
      </Deck>

      <Dots aria-hidden>
        {visibleModes.map((m, i) => (
          <DotSpan key={m} $on={i === dot} />
        ))}
      </Dots>

      <ExploreBtn type="button" onClick={() => router.push('/onboarding/role')}>
        Explore other roles <ChevronRight size={15} aria-hidden />
      </ExploreBtn>

      {previewMeta ? (
        <Sheet
          open
          onClose={() => setPreview(null)}
          ariaLabel={`${previewMeta.label} role preview`}
          initialSnap="half"
          footer={
            <Button fullWidth loading={addRole.isPending} onClick={() => confirm(preview!)}>
              {holdsMode(roles, preview!)
                ? `Switch to ${previewMeta.label}`
                : `Become a ${previewMeta.label}`}
            </Button>
          }
        >
          <PreviewBody>
            <PreviewHead>
              {PreviewIcon ? (
                <Bubble $active>
                  <PreviewIcon size={22} aria-hidden />
                </Bubble>
              ) : null}
              <div>
                <PreviewTitle>{previewMeta.label}</PreviewTitle>
                <PreviewTagline>{previewMeta.tagline}</PreviewTagline>
              </div>
            </PreviewHead>
            <Benefits>
              {previewMeta.benefits.map((b) => (
                <li key={b}>
                  <Check size={15} aria-hidden />
                  {b}
                </li>
              ))}
            </Benefits>
          </PreviewBody>
        </Sheet>
      ) : null}
    </Section>
  );
}

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  justify-items: center;
  min-width: 0;
`;
const Deck = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  /* Edge padding lets the first/last tile center while its neighbor peeks. */
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[6]}px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    scroll-behavior: smooth;
  }
`;
const Tile = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  width: ${({ $active }) => ($active ? 118 : 96)}px;
  scroll-snap-align: center;
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[2]}px;
  cursor: pointer;
  border-radius: 20px;
  border: 1.5px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line)};
  background: ${({ theme, $active }) =>
    $active
      ? `linear-gradient(160deg, color-mix(in srgb, ${theme.color.accentPrimary} 20%, ${theme.color.surfaceRaised}), ${theme.color.surfaceRaised})`
      : theme.color.surfaceRaised};
  box-shadow: ${({ theme, $active }) =>
    $active
      ? `0 0 0 4px color-mix(in srgb, ${theme.color.accentPrimary} 20%, transparent), ${theme.color.shadow}`
      : 'none'};
  transform: ${({ $active }) => ($active ? 'translateY(-4px)' : 'none')};
  transition:
    transform ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut},
    box-shadow ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut},
    border-color ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
  &:active {
    transform: scale(0.97);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;
const Bubble = styled.span<{ $active: boolean }>`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: ${({ theme, $active }) =>
    $active
      ? theme.color.accentPrimary
      : `color-mix(in srgb, ${theme.color.textSecondary} 12%, transparent)`};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.color.textSecondary)};
`;
const TileName = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  line-height: 1.25;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ActiveBadge = styled.span`
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
`;
const Dots = styled.div`
  display: flex;
  gap: 6px;
`;
const DotSpan = styled.span<{ $on: boolean }>`
  width: ${({ $on }) => ($on ? 16 : 6)}px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme, $on }) => ($on ? theme.color.accentPrimary : theme.color.line2)};
  transition: width ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
`;
const ExploreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentPrimary};
  }
`;
const PreviewBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
`;
const PreviewHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const PreviewTitle = styled.h2`
  font-size: 19px;
  font-weight: 800;
`;
const PreviewTagline = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Benefits = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  list-style: none;
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: ${({ theme }) => theme.color.textPrimary};
    svg {
      flex: none;
      margin-top: 2px;
      color: ${({ theme }) => theme.color.statusLive};
    }
  }
`;
