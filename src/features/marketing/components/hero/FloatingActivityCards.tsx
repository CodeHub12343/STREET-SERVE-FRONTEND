'use client';

/**
 * Floating activity cards (hero spec §4) — glass cards that surface simulation events on the
 * right edge of the scene. Purely decorative: aria-hidden (their story is told in section copy;
 * a live region firing every few seconds would be hostile — a11y spec §5). Max 2 concurrent is
 * guaranteed by the director's schedule and asserted in its tests.
 */
import styled from 'styled-components';
import { AnimatePresence, m } from 'motion/react';
import type { CardCue } from '../../sim/scene';
import { glass } from '../../mk';

export function FloatingActivityCards({ cards }: { cards: CardCue[] }) {
  return (
    <Stack aria-hidden>
      {/* Lifecycle per animation spec §6: 24px rise + fade 500ms in, 300ms fade-down out. */}
      <AnimatePresence>
        {cards.map((card) => (
          <m.div
            key={card.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0, 0, 1] } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
          >
            <Card>
              <Icon>{card.icon}</Icon>
              <Text>{card.text}</Text>
            </Card>
          </m.div>
        ))}
      </AnimatePresence>
    </Stack>
  );
}

const Stack = styled.div`
  position: absolute;
  right: 16px;
  bottom: 56px;
  z-index: 10;
  display: grid;
  gap: 10px;
  justify-items: end;
  pointer-events: none;
  ${({ theme }) => theme.media.md} {
    right: 32px;
    bottom: 96px;
  }
`;

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 280px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  ${({ theme }) => glass(theme)}
  box-shadow: ${({ theme }) => theme.color.shadow};
`;

const Icon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

const Text = styled.p`
  font-size: 13px;
  font-weight: 650;
`;
