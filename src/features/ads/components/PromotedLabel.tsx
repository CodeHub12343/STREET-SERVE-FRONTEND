'use client';

/**
 * The disclosure label carried by every paid placement (F-1/F-3).
 *
 * There is deliberately no prop that hides or renames it. The backend attaches `label` to every
 * served ad and every placement it returns, on the assumption that the client always shows it —
 * paid placement the user cannot distinguish from an organic result is exactly what makes a
 * discovery feed untrustworthy, and an untrusted feed is worth less than the placement fees it
 * collects.
 *
 * It is also announced to assistive tech rather than being purely visual: "this is an ad" is
 * information, not decoration.
 */
import styled from 'styled-components';
import { Megaphone } from 'lucide-react';

export function PromotedLabel({ label, className }: { label: string; className?: string }) {
  return (
    <Tag className={className}>
      <Megaphone size={11} aria-hidden />
      <span>{label}</span>
    </Tag>
  );
}

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  svg {
    flex: none;
  }
`;
