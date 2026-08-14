'use client';

/**
 * HeroMapLayer — the capability-ladder orchestrator (3D spec §7). Resolves the tier, waits for
 * mount intent (pointer-enter / scroll / 1.5s idle), and mounts the LiveMapScene for T1/T2.
 * T3 and 'ssr' render nothing — the hero's static panel IS the designed fallback. T0
 * (reduced motion) renders the "Play preview" opt-in instead (a11y spec §4).
 */
import { useRef, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useCapabilityTier } from '../../hooks/useCapabilityTier';
import { useHeroMapIntent } from '../../hooks/useHeroMapIntent';
import { glass } from '../../mk';

const LiveMapScene = dynamic(
  () => import('./LiveMapScene').then((m) => m.LiveMapScene),
  { ssr: false },
);

export function HeroMapLayer({ heroRef }: { heroRef: RefObject<HTMLElement | null> }) {
  const { tier, playAnyway } = useCapabilityTier();
  const intent = useHeroMapIntent(heroRef);
  const optedInRef = useRef(false);

  if (tier === 'T0') {
    return (
      <PlayButton
        type="button"
        onClick={() => {
          optedInRef.current = true;
          playAnyway();
        }}
      >
        <span aria-hidden>▶</span> Play animated map preview
      </PlayButton>
    );
  }

  if ((tier === 'T1' || tier === 'T2') && (intent || optedInRef.current)) {
    return <LiveMapScene tier={tier} />;
  }

  // 'ssr' | 'T3' | awaiting intent → the static poster underneath carries the scene.
  return null;
}

const PlayButton = styled.button`
  position: absolute;
  left: 16px;
  bottom: 12px;
  z-index: 15;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  color: ${({ theme }) => theme.color.textPrimary};
  ${({ theme }) => glass(theme)}
`;
