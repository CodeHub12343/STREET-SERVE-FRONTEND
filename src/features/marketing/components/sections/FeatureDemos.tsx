'use client';

/**
 * Feature micro-demos (Section Breakdown §4, animation spec §6) — one tiny looping SVG scene per
 * bento card. Plays while `playing` (hover on pointer devices; ≥80% visible one-at-a-time on
 * touch); idle shows the designed first frame (animations detach, elements rest at base state).
 * transform/opacity only; the global reduced-motion rule collapses all of it.
 */
import type { ComponentType } from 'react';
import styled, { css, keyframes } from 'styled-components';

export interface DemoProps {
  playing: boolean;
}

/** Transient prop for styled elements — `$` keeps it off the DOM (styled-components rule). */
type Playing = { $playing: boolean };

const Frame = styled.svg`
  width: 100%;
  height: 72px;
  display: block;
  overflow: visible;
`;

const anim = (frames: ReturnType<typeof keyframes>, duration: string, playing: boolean) =>
  playing
    ? css`
        animation: ${frames} ${duration} cubic-bezier(0.2, 0, 0, 1) infinite;
      `
    : css`
        animation: none;
      `;

/* ---- 1 · Wave Down: customer ring expands, vendor pin drives over ---- */

const ringOut = keyframes`
  0% { transform: scale(0.4); opacity: 0.9; }
  60%, 100% { transform: scale(1.6); opacity: 0; }
`;
const driveOver = keyframes`
  0%, 15% { transform: translateX(0); }
  60%, 80% { transform: translateX(-96px); }
  100% { transform: translateX(0); }
`;

const WaveRing = styled.circle<Playing>`
  transform-origin: 48px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(ringOut, '2.4s', $playing)}
`;
const WavePin = styled.g<Playing>`
  ${({ $playing }) => anim(driveOver, '2.4s', $playing)}
`;

function WaveDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <circle cx="48" cy="40" r="6" fill="var(--demo-accent2)" />
      <WaveRing $playing={playing} cx="48" cy="40" r="14" fill="none" stroke="var(--demo-accent2)" strokeWidth="2" />
      <WavePin $playing={playing}>
        <circle cx="196" cy="40" r="13" fill="var(--demo-surface)" stroke="var(--demo-live)" strokeWidth="3" />
        <circle cx="196" cy="40" r="4" fill="var(--demo-live)" />
      </WavePin>
      <path d="M62 40h116" stroke="var(--demo-line)" strokeWidth="1.5" strokeDasharray="3 4" />
    </Frame>
  );
}

/* ---- 2 · Line-Up Discounts: queue dots claim tiered discounts ---- */

const claim = (delay: string) => css`
  animation-delay: ${delay};
`;
const popIn = keyframes`
  0%, 10% { opacity: 0.25; transform: scale(0.85); }
  22%, 75% { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0.25; transform: scale(0.85); }
`;
const QueueSlot = styled.g<Playing & { $delay: string; $cx: number }>`
  transform-origin: ${({ $cx }) => $cx}px 40px;
  transform-box: view-box;
  opacity: 0.25;
  ${({ $playing }) => anim(popIn, '3s', $playing)}
  ${({ $delay }) => claim($delay)}
`;

function LineupDemo({ playing }: DemoProps) {
  const slots = [
    { cx: 56, label: '15%' },
    { cx: 120, label: '10%' },
    { cx: 184, label: '5%' },
  ];
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      {slots.map((s, i) => (
        <QueueSlot key={s.label} $playing={playing} $delay={`${i * 0.35}s`} $cx={s.cx}>
          <circle cx={s.cx} cy="32" r="9" fill="var(--demo-surface)" stroke="var(--demo-discount)" strokeWidth="2.5" />
          <text x={s.cx} y="62" textAnchor="middle" fontSize="12" fontWeight="750" fill="var(--demo-text)">
            {s.label}
          </text>
        </QueueSlot>
      ))}
    </Frame>
  );
}

/* ---- 3 · Ping Your Squad: ripple reaches friends, tip coin pops ---- */

const friendLight = keyframes`
  0%, 25% { opacity: 0.25; }
  45%, 75% { opacity: 1; }
  95%, 100% { opacity: 0.25; }
`;
const coinPop = keyframes`
  0%, 55% { opacity: 0; transform: scale(0.5); }
  70%, 85% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.5); }
`;
const PingRipple = styled.circle<Playing>`
  transform-origin: 56px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(ringOut, '2.8s', $playing)}
`;
const Friend = styled.circle<Playing & { $delay: string }>`
  opacity: 0.25;
  ${({ $playing }) => anim(friendLight, '2.8s', $playing)}
  animation-delay: ${({ $delay }) => $delay};
`;
const Coin = styled.g<Playing>`
  opacity: 0;
  transform-origin: 204px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(coinPop, '2.8s', $playing)}
`;

function PingDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <circle cx="56" cy="40" r="7" fill="var(--demo-accent2)" />
      <PingRipple $playing={playing} cx="56" cy="40" r="16" fill="none" stroke="var(--demo-accent2)" strokeWidth="2" />
      <Friend $playing={playing} $delay="0.2s" cx="120" cy="26" r="6" fill="var(--demo-discount)" />
      <Friend $playing={playing} $delay="0.4s" cx="128" cy="54" r="6" fill="var(--demo-discount)" />
      <Coin $playing={playing}>
        <circle cx="204" cy="40" r="12" fill="none" stroke="var(--demo-warn)" strokeWidth="2.5" />
        <text x="204" y="45" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--demo-text)">
          $
        </text>
      </Coin>
    </Frame>
  );
}

/* ---- 4 · Block Party: pins converge, glow blooms ---- */

const convergeL = keyframes`
  0%, 10% { transform: translateX(0); } 55%, 85% { transform: translateX(52px); } 100% { transform: translateX(0); }
`;
const convergeR = keyframes`
  0%, 10% { transform: translateX(0); } 55%, 85% { transform: translateX(-52px); } 100% { transform: translateX(0); }
`;
const bloom = keyframes`
  0%, 40% { opacity: 0; transform: scale(0.5); }
  65%, 85% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.5); }
`;
const PinL = styled.g<Playing>`
  ${({ $playing }) => anim(convergeL, '3s', $playing)}
`;
const PinR = styled.g<Playing>`
  ${({ $playing }) => anim(convergeR, '3s', $playing)}
`;
const Glow = styled.circle<Playing>`
  opacity: 0;
  transform-origin: 120px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(bloom, '3s', $playing)}
`;

function BlockPartyDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <Glow $playing={playing} cx="120" cy="40" r="30" fill="var(--demo-accent)" />
      <circle cx="120" cy="40" r="11" fill="var(--demo-surface)" stroke="var(--demo-warn)" strokeWidth="3" />
      <PinL $playing={playing}>
        <circle cx="48" cy="40" r="10" fill="var(--demo-surface)" stroke="var(--demo-live)" strokeWidth="3" />
      </PinL>
      <PinR $playing={playing}>
        <circle cx="192" cy="40" r="10" fill="var(--demo-surface)" stroke="var(--demo-live)" strokeWidth="3" />
      </PinR>
    </Frame>
  );
}

/* ---- 5 · Consignment: crate → sale → split bars fill ---- */

const barFill = keyframes`
  0%, 25% { transform: scaleX(0.12); }
  55%, 85% { transform: scaleX(1); }
  100% { transform: scaleX(0.12); }
`;
const Bar = styled.rect<Playing & { $delay: string }>`
  transform-origin: 150px 0;
  transform-box: view-box;
  transform: scaleX(0.12);
  ${({ $playing }) => anim(barFill, '2.6s', $playing)}
  animation-delay: ${({ $delay }) => $delay};
`;

function ConsignmentDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <rect x="28" y="26" width="40" height="30" rx="5" fill="none" stroke="var(--demo-line2)" strokeWidth="2" />
      <path d="M28 37h40M48 26v30" stroke="var(--demo-line2)" strokeWidth="2" />
      <path d="M78 41h48" stroke="var(--demo-muted)" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M122 35l8 6-8 6z" fill="var(--demo-muted)" />
      <Bar $playing={playing} $delay="0s" x="150" y="20" width="62" height="9" rx="4.5" fill="var(--demo-live)" />
      <Bar $playing={playing} $delay="0.15s" x="150" y="36" width="44" height="9" rx="4.5" fill="var(--demo-accent2)" />
      <Bar $playing={playing} $delay="0.3s" x="150" y="52" width="26" height="9" rx="4.5" fill="var(--demo-discount)" />
    </Frame>
  );
}

/* ---- 6 · Smart Assistant: sparkle pulses, suggestion chip slides in ---- */

const sparkle = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(0.9) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.15) rotate(12deg); }
`;
const chipIn = keyframes`
  0%, 20% { opacity: 0; transform: translateX(14px); }
  45%, 85% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(14px); }
`;
const Spark = styled.path<Playing>`
  transform-origin: 52px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(sparkle, '2.4s', $playing)}
`;
const SuggestChip = styled.g<Playing>`
  opacity: 0;
  ${({ $playing }) => anim(chipIn, '2.4s', $playing)}
`;

function AssistantDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <Spark
        $playing={playing}
        d="M52 24 l4.5 11 11 4.5 -11 4.5 -4.5 11 -4.5 -11 -11 -4.5 11 -4.5 z"
        fill="var(--demo-warn)"
      />
      <SuggestChip $playing={playing}>
        <rect x="92" y="26" width="120" height="28" rx="14" fill="var(--demo-surface2)" stroke="var(--demo-line)" />
        <text x="152" y="44" textAnchor="middle" fontSize="12" fontWeight="650" fill="var(--demo-text)">
          Try 5th &amp; K St · 4–6pm
        </text>
      </SuggestChip>
    </Frame>
  );
}

/* ---- 7 · Gifting & Spot Me: a gift arcs from one person to another ---- */

const giftArc = keyframes`
  0%, 12% { transform: translate(0, 0); opacity: 1; }
  55% { transform: translate(104px, -26px); opacity: 1; }
  70%, 82% { transform: translate(128px, 0); opacity: 1; }
  95%, 100% { transform: translate(0, 0); opacity: 0; }
`;
const heartPop = keyframes`
  0%, 60% { opacity: 0; transform: scale(0.5); }
  75%, 90% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.5); }
`;
const Gift = styled.g<Playing>`
  ${({ $playing }) => anim(giftArc, '2.8s', $playing)}
`;
const Heart = styled.text<Playing>`
  opacity: 0;
  transform-origin: 188px 22px;
  transform-box: view-box;
  ${({ $playing }) => anim(heartPop, '2.8s', $playing)}
`;

function GiftingDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <circle cx="48" cy="52" r="9" fill="var(--demo-accent2)" />
      <circle cx="188" cy="52" r="9" fill="var(--demo-discount)" />
      <Gift $playing={playing}>
        <rect x="40" y="26" width="16" height="14" rx="3" fill="var(--demo-accent)" />
        <path d="M40 32h16M48 26v14" stroke="var(--demo-surface)" strokeWidth="1.6" />
      </Gift>
      <Heart $playing={playing} x="188" y="28" textAnchor="middle" fontSize="14">
        💜
      </Heart>
    </Frame>
  );
}

/* ---- 8 · Scheduling: booking slot confirms, bell nudges ---- */

const slotConfirm = keyframes`
  0%, 20% { opacity: 0.25; }
  40%, 85% { opacity: 1; }
  100% { opacity: 0.25; }
`;
const bellNudge = keyframes`
  0%, 55% { transform: rotate(0deg); }
  62% { transform: rotate(14deg); }
  70% { transform: rotate(-10deg); }
  78%, 100% { transform: rotate(0deg); }
`;
const Slot = styled.g<Playing>`
  opacity: 0.25;
  ${({ $playing }) => anim(slotConfirm, '2.6s', $playing)}
`;
const Bell = styled.text<Playing>`
  transform-origin: 196px 40px;
  transform-box: view-box;
  ${({ $playing }) => anim(bellNudge, '2.6s', $playing)}
`;

function SchedulingDemo({ playing }: DemoProps) {
  return (
    <Frame viewBox="0 0 240 80" aria-hidden focusable="false">
      <rect x="36" y="18" width="108" height="46" rx="8" fill="none" stroke="var(--demo-line2)" strokeWidth="2" />
      <path d="M36 32h108" stroke="var(--demo-line2)" strokeWidth="2" />
      <Slot $playing={playing}>
        <rect x="48" y="40" width="28" height="14" rx="4" fill="var(--demo-live)" opacity="0.9" />
        <text x="62" y="51" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--demo-surface)">
          TUE
        </text>
      </Slot>
      <Bell $playing={playing} x="196" y="48" textAnchor="middle" fontSize="20">
        🔔
      </Bell>
    </Frame>
  );
}

export const featureDemos: Record<string, ComponentType<DemoProps>> = {
  wave: WaveDemo,
  lineup: LineupDemo,
  ping: PingDemo,
  blockparty: BlockPartyDemo,
  consignment: ConsignmentDemo,
  assistant: AssistantDemo,
  gifting: GiftingDemo,
  scheduling: SchedulingDemo,
};
