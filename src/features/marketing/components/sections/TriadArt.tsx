'use client';

/**
 * HowItWorksTriad illustrations (Section Breakdown §3, LP-4) — three inline SVG mini-scenes in
 * the design language of the hero map (status rings, route dashes, split bars). Theme-aware via
 * styled tokens; decorative (aria-hidden — the copy carries the meaning). Static by design:
 * the triad explains, the hero demonstrates.
 */
import styled, { useTheme } from 'styled-components';

const Frame = styled.svg`
  width: 100%;
  height: 96px;
  display: block;
`;

/** FIND — a live pin radiating proximity rings on a street grid, a customer dot nearby. */
export function FindScene() {
  const t = useTheme();
  const grid = t.color.line;
  const live = t.status('driving');
  return (
    <Frame viewBox="0 0 240 96" aria-hidden focusable="false">
      <g stroke={grid} strokeWidth="1">
        <path d="M0 24h240M0 56h240M0 88h240M40 0v96M110 0v96M180 0v96" />
      </g>
      <circle cx="110" cy="48" r="30" fill="none" stroke={live} strokeOpacity="0.25" />
      <circle cx="110" cy="48" r="18" fill="none" stroke={live} strokeOpacity="0.5" />
      <circle cx="110" cy="48" r="9" fill={t.color.surfaceRaised} stroke={live} strokeWidth="3" />
      <circle cx="110" cy="48" r="3" fill={live} />
      <circle cx="176" cy="72" r="5" fill={t.color.accentSecondary} />
      <path
        d="M171 68 Q140 52 121 50"
        fill="none"
        stroke={t.color.accentSecondary}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
    </Frame>
  );
}

/** EARN — a crate of inventory flowing into a sale that splits into shares. */
export function EarnScene() {
  const t = useTheme();
  const line = t.color.line2;
  return (
    <Frame viewBox="0 0 240 96" aria-hidden focusable="false">
      <rect x="18" y="34" width="44" height="34" rx="6" fill="none" stroke={line} strokeWidth="2" />
      <path d="M18 46h44M40 34v34" stroke={line} strokeWidth="2" />
      <path
        d="M70 51h48"
        stroke={t.color.textSecondary}
        strokeWidth="2"
        strokeDasharray="4 4"
        markerEnd="none"
      />
      <path d="M114 45l8 6-8 6z" fill={t.color.textSecondary} />
      <circle cx="152" cy="51" r="16" fill="none" stroke={t.color.accentPrimary} strokeWidth="3" />
      <text
        x="152"
        y="56"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill={t.color.textPrimary}
      >
        $
      </text>
      <rect x="184" y="30" width="38" height="8" rx="4" fill={t.status('driving')} />
      <rect x="184" y="46" width="26" height="8" rx="4" fill={t.color.accentSecondary} />
      <rect x="184" y="62" width="14" height="8" rx="4" fill={t.status('discount')} />
    </Frame>
  );
}

/** GROW — a route climbing through stops, each stop's ring bigger than the last. */
export function GrowScene() {
  const t = useTheme();
  return (
    <Frame viewBox="0 0 240 96" aria-hidden focusable="false">
      <path
        d="M20 80 C 70 78, 90 60, 120 52 S 190 30, 222 18"
        fill="none"
        stroke={t.status('driving')}
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <circle cx="20" cy="80" r="6" fill={t.color.surfaceRaised} stroke={t.status('parked')} strokeWidth="2.5" />
      <circle cx="120" cy="52" r="8" fill={t.color.surfaceRaised} stroke={t.status('parked')} strokeWidth="3" />
      <circle
        cx="222"
        cy="18"
        r="11"
        fill={t.color.surfaceRaised}
        stroke={t.status('driving')}
        strokeWidth="3.5"
      />
      <circle cx="222" cy="18" r="4" fill={t.status('driving')} />
    </Frame>
  );
}

export const triadScenes = {
  find: FindScene,
  earn: EarnScene,
  grow: GrowScene,
} as const;
