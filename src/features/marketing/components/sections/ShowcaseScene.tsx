'use client';

/**
 * ShowcaseScene (animation spec §4) — the stylized map panel the showcase beats play on.
 * Declarative: `beat` (1–4) decides which elements are on stage; every element transitions
 * opacity/transform only, with the queue rail staggered 70ms. `animated=false` (carousel
 * fallback / reduced motion) renders the same state as a still. Beats are cumulative going
 * forward; scrolling back simply lowers `beat` and elements retire the same way they arrived.
 */
import styled, { css } from 'styled-components';
import { glass } from '../../mk';

export interface ShowcaseSceneProps {
  beat: 1 | 2 | 3 | 4;
  animated?: boolean;
}

export function ShowcaseScene({ beat, animated = true }: ShowcaseSceneProps) {
  return (
    <Panel $animated={animated} aria-hidden>
      <GridBg />
      <RouteSvg viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Vendor's route (always present, faint). */}
        <path className="route" d="M10 20 C 30 30, 30 45, 34 58" />
        {/* Wave arc: customer → vendor (beat ≥2). */}
        <path className="arc" data-on={beat >= 2} d="M72 72 Q 55 75 38 62" />
      </RouteSvg>

      {/* Vendor pin — drops in on beat 1. */}
      <Pin data-on={beat >= 1} style={{ left: '34%', top: '58%' }}>
        <PinFace>🌮</PinFace>
      </Pin>
      <Chip data-on={beat >= 1} style={{ left: '34%', top: '44%' }}>
        Tacos El Rey · Live
      </Chip>

      {/* Customer + wave (beat 2). */}
      <CustomerDot data-on={beat >= 2} style={{ left: '72%', top: '72%' }} />
      <Chip data-on={beat >= 2} style={{ left: '72%', top: '82%' }}>
        👋 Maria waved
      </Chip>
      <Chip data-on={beat >= 2} $accent style={{ left: '48%', top: '52%' }}>
        ETA 4 min
      </Chip>

      {/* Queue rail (beat 3) — 5 dots, 70ms stagger, tier chips. */}
      <QueueRail data-on={beat >= 3} style={{ left: '34%', top: '74%' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <QueueDot key={i} $i={i} data-on={beat >= 3} />
        ))}
      </QueueRail>
      <Chip data-on={beat >= 3} $discount style={{ left: '34%', top: '86%' }}>
        #1 · 15% → #2 · 10% → #3 · 5%
      </Chip>

      {/* Receipt (beat 4). */}
      <Receipt data-on={beat >= 4}>
        <ReceiptTitle>Paid &amp; square</ReceiptTitle>
        <Row>
          <span>Carne asada ×2</span>
          <span className="tnum">$12.00</span>
        </Row>
        <Row>
          <span>Early-bird −15%</span>
          <span className="tnum">−$1.80</span>
        </Row>
        <Row>
          <span>Round-up tip</span>
          <span className="tnum">+$0.30</span>
        </Row>
        <Total>
          <span>Total</span>
          <span className="tnum">$10.50</span>
        </Total>
        <SplitBar data-on={beat >= 4}>
          <Seg $w={70} $c="live" />
          <Seg $w={22} $c="parked" />
          <Seg $w={8} $c="discount" />
        </SplitBar>
      </Receipt>
    </Panel>
  );
}

const ease = 'cubic-bezier(0.2, 0, 0, 1)';

const Panel = styled.div<{ $animated: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'radial-gradient(110% 90% at 60% 20%, #171B26 0%, #101218 60%, #0E0F12 100%)'
      : 'radial-gradient(110% 90% at 60% 20%, #EEF1F6 0%, #F6F6F4 60%, #FAFAF9 100%)'};
  ${({ $animated }) =>
    !$animated &&
    css`
      * {
        transition: none !important;
      }
    `}
`;

const GridBg = styled.div`
  position: absolute;
  inset: 0;
  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(rgba(156,159,168,0.07) 1px, transparent 1px),
         linear-gradient(90deg, rgba(156,159,168,0.07) 1px, transparent 1px)`
      : `linear-gradient(rgba(91,94,104,0.09) 1px, transparent 1px),
         linear-gradient(90deg, rgba(91,94,104,0.09) 1px, transparent 1px)`};
  background-size: 56px 56px;
`;

const RouteSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  .route {
    fill: none;
    stroke: ${({ theme }) => theme.status('driving')};
    stroke-width: 0.7;
    stroke-dasharray: 2 2;
    opacity: 0.35;
  }
  .arc {
    fill: none;
    stroke: ${({ theme }) => theme.color.accentPrimary};
    stroke-width: 1;
    stroke-linecap: round;
    opacity: 0;
    transform: scale(0.96);
    transform-origin: 60% 65%;
    transition:
      opacity 400ms ${ease},
      transform 400ms ${ease};
    &[data-on='true'] {
      opacity: 0.9;
      transform: scale(1);
    }
  }
`;

const stagedBase = css`
  position: absolute;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition:
    opacity 400ms ${ease},
    transform 400ms ${ease};
`;

const Pin = styled.div`
  ${stagedBase}
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 3px solid ${({ theme }) => theme.status('driving')};
  box-shadow: 0 0 14px ${({ theme }) => `${theme.status('driving')}55`};
  transform: translate(-50%, calc(-50% - 24px)) scale(0.6);
  &[data-on='true'] {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const PinFace = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const Chip = styled.span<{ $accent?: boolean; $discount?: boolean }>`
  ${stagedBase}
  padding: 5px 11px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  ${({ theme }) => glass(theme)}
  color: ${({ theme, $accent, $discount }) =>
    $accent
      ? theme.color.accentPrimary
      : $discount
        ? theme.status('discount')
        : theme.color.textPrimary};
  transform: translate(-50%, calc(-50% + 8px));
  &[data-on='true'] {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
`;

const CustomerDot = styled.span`
  ${stagedBase}
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accentSecondary};
  box-shadow: 0 0 10px ${({ theme }) => `${theme.color.accentSecondary}88`};
  transform: translate(-50%, -50%) scale(0.4);
  &[data-on='true'] {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const QueueRail = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 8px;
`;

const QueueDot = styled.span<{ $i: number }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme }) => theme.status('discount')};
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 300ms ${ease} ${({ $i }) => $i * 70}ms,
    transform 300ms ${ease} ${({ $i }) => $i * 70}ms;
  &[data-on='true'] {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Receipt = styled.div`
  position: absolute;
  right: 5%;
  bottom: 8%;
  width: min(230px, 55%);
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  ${({ theme }) => glass(theme)}
  box-shadow: ${({ theme }) => theme.color.shadow};
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 300ms ${ease},
    transform 300ms ${ease};
  &[data-on='true'] {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ReceiptTitle = styled.p`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Total = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 800;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const SplitBar = styled.div`
  display: flex;
  gap: 2px;
  height: 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  overflow: hidden;
  > * {
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 500ms ${ease} 150ms;
  }
  &[data-on='true'] > * {
    transform: scaleX(1);
  }
`;

const Seg = styled.span<{ $w: number; $c: 'live' | 'parked' | 'discount' }>`
  width: ${({ $w }) => $w}%;
  background: ${({ theme, $c }) => theme.status($c)};
`;
