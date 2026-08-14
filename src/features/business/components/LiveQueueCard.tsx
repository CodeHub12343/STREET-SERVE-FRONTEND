'use client';

/**
 * C-14 live queue card (Concept D — Fullscreen Takeover). The queue is the emotional core of the
 * business surface, so it reads as a LIVE experience rather than static text: a pulsing "live" tag,
 * an ambient activity wave, the customer's would-be position + a derived wait estimate, a qualitative
 * busy meter, and the discount tier ladder folded in below. Supersedes the old QueueDiscountCard.
 *
 * Honesty note: position and discount tiers are real backend data. The wait figure is an explicit
 * ~estimate (labelled and prefixed), and the wave is ambient decoration signalling "live" — it is
 * NOT plotted from any metric, so it can never misrepresent one.
 */
import styled, { keyframes } from 'styled-components';
import { Users } from 'lucide-react';
import type { QueueState } from '../types';

/** Rough per-person service estimate used only for the ~wait figure. */
const MIN_PER_PERSON = 4;
/** Head-count treated as "full" for the qualitative busy meter. */
const BUSY_CEILING = 10;

function busyLevel(count: number): { label: string; fill: number } {
  const fill = Math.min(count / BUSY_CEILING, 1);
  if (count <= 2) return { label: 'Quiet', fill: Math.max(fill, 0.12) };
  if (count <= 6) return { label: 'Filling up', fill };
  return { label: 'Busy', fill };
}

export function LiveQueueCard({ queue }: { queue: QueueState }) {
  const nextPosition = queue.count + 1;
  const wouldBe = queue.schedule.find((s) => s.position === nextPosition) ?? queue.schedule.at(-1);
  const waitMin = nextPosition * MIN_PER_PERSON;
  const busy = busyLevel(queue.count);

  return (
    <Card>
      <TopRow>
        <LiveTag>
          <Dot aria-hidden />
          Live queue
        </LiveTag>
        <Heads>
          <Users size={13} aria-hidden />
          <b className="tnum">{queue.count}</b> waiting
        </Heads>
      </TopRow>

      <Wave aria-hidden viewBox="0 0 240 40" preserveAspectRatio="none">
        <WavePath d="M0 28 C 20 10, 40 10, 60 24 S 100 38, 120 24 S 160 10, 180 24 S 220 38, 240 24 L 240 40 L 0 40 Z" />
        <WaveLine d="M0 28 C 20 10, 40 10, 60 24 S 100 38, 120 24 S 160 10, 180 24 S 220 38, 240 24" />
      </Wave>

      <PositionRow>
        <Position>
          <span>You’d be</span>
          <b className="tnum">#{nextPosition}</b>
          <span>in line</span>
        </Position>
        <Wait>
          ~{waitMin} min<small>est. wait</small>
        </Wait>
      </PositionRow>

      <Meter aria-label={`Queue is ${busy.label.toLowerCase()}`}>
        <MeterFill style={{ width: `${Math.round(busy.fill * 100)}%` }} />
      </Meter>
      <MeterLabel>{busy.label}</MeterLabel>

      {wouldBe && wouldBe.percent > 0 ? (
        <Ladder aria-label="Discount tiers by position">
          {queue.schedule.map((tier) => {
            const consumed = tier.position <= queue.count;
            const mine = tier.position === nextPosition;
            return (
              <Rung key={tier.position} $consumed={consumed} $mine={mine}>
                #{tier.position} · {tier.percent}%
              </Rung>
            );
          })}
          <Lock>
            joining now locks in <b>{wouldBe.percent}% off</b>
          </Lock>
        </Ladder>
      ) : null}
    </Card>
  );
}

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
`;
const flow = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-120px); }
`;

const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 10%, ${theme.color.surfaceRaised})`};
  border: 1px solid ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 30%, transparent)`};
  overflow: hidden;
`;
const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const LiveTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 55%, ${theme.color.textPrimary})`};
`;
const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.statusLive};
  animation: ${pulse} 1.6s ${({ theme }) => theme.motion.easeOut} infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const Heads = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-weight: 800;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Wave = styled.svg`
  width: 100%;
  height: 40px;
  display: block;
  opacity: 0.9;
`;
const WavePath = styled.path`
  fill: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 22%, transparent)`};
  animation: ${flow} 3.5s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const WaveLine = styled.path`
  fill: none;
  stroke: ${({ theme }) => theme.color.statusDiscount};
  stroke-width: 2;
  stroke-linecap: round;
  animation: ${flow} 3.5s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const PositionRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Position = styled.p`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Wait = styled.p`
  display: grid;
  justify-items: end;
  font-size: 17px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
  small {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const Meter = styled.div`
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const MeterFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.color.statusDiscount};
  transition: width ${({ theme }) => theme.motion.sheet}ms ${({ theme }) => theme.motion.easeOut};
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const MeterLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: -4px;
`;
const Ladder = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;
const Rung = styled.span<{ $consumed: boolean; $mine: boolean }>`
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  text-decoration: ${({ $consumed }) => ($consumed ? 'line-through' : 'none')};
  opacity: ${({ $consumed }) => ($consumed ? 0.45 : 1)};
  color: ${({ theme, $mine }) => ($mine ? '#fff' : theme.color.textSecondary)};
  background: ${({ theme, $mine }) => ($mine ? theme.color.statusDiscount : theme.color.surfaceRaised2)};
`;
const Lock = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-weight: 800;
    color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 55%, ${theme.color.textPrimary})`};
  }
`;
