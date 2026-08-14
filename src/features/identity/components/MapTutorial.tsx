'use client';

/**
 * C-09 First-run map tutorial — coach marks shown over the map when it opens with ?tour=1. A short
 * dismissible sequence; on finish it clears the query param so it doesn't re-show. (Anchored
 * highlights land alongside the real map in Milestone 3; for now it's a centered tip sequence.)
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { MapPinned, ListFilter, Crosshair, Hand } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

const TIPS = [
  { icon: <MapPinned size={28} />, title: 'Live pins', body: 'Each pin is a business on the move — the colored ring shows Driving, Parked, or Closed.' },
  { icon: <ListFilter size={28} />, title: 'Filter fast', body: 'Use the category tabs and search to find exactly what you want nearby.' },
  { icon: <Crosshair size={28} />, title: 'Serve Near Me', body: 'Recenter on your location and refresh who’s around you.' },
  { icon: <Hand size={28} />, title: 'Wave them down', body: 'Tap a pin, then wave a vendor over or join the line-up for a discount.' },
];

export function MapTutorial() {
  const router = useRouter();
  const params = useSearchParams();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(params.get('tour') === '1');

  if (!open) return null;

  const tip = TIPS[i]!;
  const last = i === TIPS.length - 1;

  const dismiss = () => {
    setOpen(false);
    router.replace('/map');
  };

  return (
    <Scrim role="dialog" aria-modal="true" aria-label="Map tutorial">
      <Card>
        <Icon aria-hidden>{tip.icon}</Icon>
        <h2>{tip.title}</h2>
        <p>{tip.body}</p>
        <Dots>
          {TIPS.map((_, n) => (
            <Dot key={n} $active={n === i} />
          ))}
        </Dots>
        <Actions>
          <Button variant="tertiary" size="compact" onClick={dismiss}>
            Skip
          </Button>
          <Button size="compact" onClick={() => (last ? dismiss() : setI((n) => n + 1))}>
            {last ? 'Got it' : 'Next'}
          </Button>
        </Actions>
      </Card>
    </Scrim>
  );
}

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  /* Modal layer (950): a first-run coach-mark must cover the DiscoverySheet (890), the OrbitNav
     dock (900/901) and any open Sheet (920) — otherwise the bottom sheet overlaps its Skip/Next
     actions and the tour can't be advanced or dismissed. Below toasts (1000). */
  z-index: 950;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[5]}px;
  background: rgba(0, 0, 0, 0.4);
`;
const Card = styled.div`
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  box-shadow: ${({ theme }) => theme.color.shadow};
  h2 {
    font-size: 19px;
  }
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Icon = styled.div`
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const Dots = styled.div`
  display: flex;
  gap: 6px;
`;
const Dot = styled.span<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 18 : 6)}px;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  transition: width ${({ theme }) => theme.motion.standard}ms;
`;
const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
