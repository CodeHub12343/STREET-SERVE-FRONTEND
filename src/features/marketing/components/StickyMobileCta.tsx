'use client';

/**
 * StickyMobileCta (IA §3, animation spec §6) — mobile-only bottom bar that slides up once the
 * hero (with its always-visible CTA) leaves the viewport, keeping the primary action one thumb
 * away. Hides while the wizard is open; respects the safe area.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { cta } from '../content';
import { glass } from '../mk';
import { useConversion } from '../prereg/ConversionContext';
import { ConversionCta } from './ConversionCta';

export function StickyMobileCta() {
  const { isOpen } = useConversion();
  const [heroGone, setHeroGone] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const io = new IntersectionObserver(
      (entries) => setHeroGone(!(entries[0]?.isIntersecting ?? true)),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const visible = heroGone && !isOpen;

  return (
    <Bar $visible={visible} aria-hidden={!visible}>
      <ConversionCta
        source="sticky-mobile"
        $variant="primary"
        $fullWidth
        tabIndex={visible ? 0 : -1}
      >
        {cta.primary}
      </ConversionCta>
    </Bar>
  );
}

const Bar = styled.div<{ $visible: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  ${({ theme }) => glass(theme)}
  border-top: 1px solid ${({ theme }) => theme.color.line};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '110%')});
  transition: transform 250ms ${({ theme }) => theme.motion.easeOut};
  ${({ theme }) => theme.media.sm} {
    display: none;
  }
`;
