'use client';

/**
 * Partners & sponsors (Section Breakdown §10). Real marks only — the lead partner is rendered
 * as a text lockup until logo assets + permissions land (D3); LP-4 wires GET /sponsors.
 */
import styled from 'styled-components';
import { partners } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

export function PartnersSection() {
  return (
    <SectionShell id="partners" eyebrow={partners.eyebrow} title={partners.title} align="center">
      <Reveal>
        <LogoRow>
          <Lockup>
            <LockupName>Wonder Ice</LockupName>
            <LockupRole>National launch partner</LockupRole>
          </Lockup>
        </LogoRow>
        <CtaRow>
          <SponsorLink href={partners.cta.href}>{partners.cta.label} →</SponsorLink>
        </CtaRow>
      </Reveal>
    </SectionShell>
  );
}

const LogoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space[5]}px;
`;

const Lockup = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[6]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  text-align: center;
`;

const LockupName = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const LockupRole = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const CtaRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.space[6]}px;
`;

const SponsorLink = styled.a`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
