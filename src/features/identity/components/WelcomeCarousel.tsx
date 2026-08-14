'use client';

/**
 * C-02 Welcome carousel — 3 value-prop slides (map / wave down / earn) + Sign in / Get started.
 * The first thing a new user sees. Swipe or use the dots; "Get started" begins sign-up.
 */
import { useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { MapPinned, Hand, Wallet } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

const SLIDES = [
  {
    icon: <MapPinned size={40} />,
    title: 'See who’s near you, right now',
    body: 'Live pins for food trucks, coffee carts, street sellers and mobile services — moving on the map in real time.',
  },
  {
    icon: <Hand size={40} />,
    title: 'Wave them down',
    body: 'Flag a vendor to come to you, or join the line-up and lock in a discount that grows the earlier you commit.',
  },
  {
    icon: <Wallet size={40} />,
    title: 'Earn on your own terms',
    body: 'Sell consignment inventory with no upfront cost, pick up gigs nearby, and get paid — see good, do good.',
  },
];

export function WelcomeCarousel() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  return (
    <Root>
      <Slide key={index}>
        <IconWrap aria-hidden>{slide.icon}</IconWrap>
        <h1>{slide.title}</h1>
        <p>{slide.body}</p>
      </Slide>

      <Dots role="tablist" aria-label="Slides">
        {SLIDES.map((_, i) => (
          <Dot
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            $active={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </Dots>

      <Actions>
        {last ? (
          <Link href="/sign-up">
            <Button fullWidth>Get started</Button>
          </Link>
        ) : (
          <Button fullWidth onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        )}
        <Link href="/sign-in">
          <Button variant="tertiary" fullWidth>
            I already have an account
          </Button>
        </Link>
      </Actions>
    </Root>
  );
}

const Root = styled.div`
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    calc(${({ theme }) => theme.space[6]}px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: ${({ theme }) => theme.space[5]}px;
`;
const Slide = styled.div`
  align-self: center;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  text-align: center;
  h1 {
    font-size: clamp(26px, 6vw, 34px);
    letter-spacing: -0.02em;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 16px;
    max-width: 40ch;
    margin: 0 auto;
  }
`;
const IconWrap = styled.div`
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0 auto;
  border-radius: ${({ theme }) => theme.radius.card}px;
  color: ${({ theme }) => theme.color.accentPrimary};
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.accentPrimary} 14%, transparent)`};
`;
const Dots = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;
const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 24 : 8)}px;
  height: 8px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  transition: width ${({ theme }) => theme.motion.standard}ms;
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
