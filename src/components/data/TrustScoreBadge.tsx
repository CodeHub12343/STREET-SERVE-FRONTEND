'use client';

/**
 * Trust/Reputation score badge (docs/06 §2.6, §1 "make trust visible") — score + one-line "why"
 * on tap. Trust must always be shown with an explanation; opaque scoring loses a gig audience.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/primitives/Modal';

export interface TrustScoreBadgeProps {
  score: number; // 0–100
  /** Formula version, shown in the explainer for transparency. */
  version?: string;
  size?: 'sm' | 'md';
}

export function TrustScoreBadge({ score, version = 'v1', size = 'md' }: TrustScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const band = score >= 85 ? 'high' : score >= 60 ? 'mid' : 'low';

  return (
    <>
      <Badge type="button" $band={band} $size={size} onClick={() => setOpen(true)} aria-label={`Trust score ${score} of 100. Tap to learn how it's calculated.`}>
        <ShieldCheck size={size === 'sm' ? 12 : 14} aria-hidden />
        <span className="tnum">{score}</span>
      </Badge>
      <Modal open={open} onClose={() => setOpen(false)} title="How trust works">
        <p>
          The Trust Score (0–100) reflects completed transactions, reviews, on-time returns, and
          dispute history — recomputed nightly and after key events. Formula {version}.
        </p>
        <p style={{ marginTop: 12 }}>
          A higher score unlocks premium inventory and faster payouts. It’s explainable by design —
          every input is one you can influence.
        </p>
      </Modal>
    </>
  );
}

type Band = 'high' | 'mid' | 'low';

const Badge = styled.button<{ $band: Band; $size: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: ${({ $size }) => ($size === 'sm' ? 22 : 26)}px;
  padding: 0 ${({ $size }) => ($size === 'sm' ? 8 : 10)}px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  cursor: pointer;
  font-weight: 800;
  font-size: ${({ $size }) => ($size === 'sm' ? 11 : 12)}px;
  /* Same-hue mix toward the text color for WCAG AA on the tint (see StatusChip). */
  color: ${({ theme, $band }) => {
    const c = $band === 'high' ? theme.color.statusLive : $band === 'mid' ? theme.color.statusWarning : theme.color.statusDanger;
    return `color-mix(in srgb, ${c} 55%, ${theme.color.textPrimary})`;
  }};
  background: ${({ theme, $band }) => {
    const c = $band === 'high' ? theme.color.statusLive : $band === 'mid' ? theme.color.statusWarning : theme.color.statusDanger;
    return `color-mix(in srgb, ${c} 16%, transparent)`;
  }};
`;
