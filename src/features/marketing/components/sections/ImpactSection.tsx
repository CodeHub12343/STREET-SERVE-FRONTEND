'use client';

/**
 * Community & impact (Section Breakdown §7) — the tagline's only appearance on the page.
 * Quieter register: no metrics, no fabricated outcomes; the program described as infrastructure.
 */
import styled from 'styled-components';
import { impact } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

export function ImpactSection() {
  return (
    <SectionShell id="impact" eyebrow={impact.eyebrow} title={impact.title} width="narrow" raised>
      <Reveal>
        <Body>{impact.body}</Body>
        <Vignette>
          <p>{impact.vignette}</p>
        </Vignette>
        <PartnerLink href={impact.cta.href}>{impact.cta.label} →</PartnerLink>
      </Reveal>
    </SectionShell>
  );
}

const Body = styled.p`
  font-size: 17px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Vignette = styled.blockquote`
  margin: ${({ theme }) => theme.space[5]}px 0;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border-left: 3px solid ${({ theme }) => theme.color.statusDiscount};
  background: ${({ theme }) => theme.color.surfaceBase};
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-style: italic;
`;

const PartnerLink = styled.a`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
