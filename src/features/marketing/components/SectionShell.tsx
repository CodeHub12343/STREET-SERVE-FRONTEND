'use client';

/**
 * SectionShell — enforces the section anatomy (IA §2: eyebrow → H2 → support → content) and the
 * accessibility contract (one H2 per section, aria-labelledby, scroll-margin under the sticky
 * nav) in a single place. Owns the header reveal (animation spec §5 — eyebrows ride the
 * container reveal, no separate animation); section bodies opt into their own Reveal groups.
 */
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { track } from '../analytics';
import { Reveal } from '../motion/Reveal';
import { displayXL, eyebrowStyle, mkLayout } from '../mk';

export interface SectionShellProps {
  id: string;
  eyebrow?: string;
  title?: string;
  support?: string;
  /** 'content' = 1200px column · 'narrow' = 720px column · 'bleed' = full width, no padding. */
  width?: 'content' | 'narrow' | 'bleed';
  /** Raised band background behind the section. */
  raised?: boolean;
  align?: 'left' | 'center';
  children: ReactNode;
}

export function SectionShell({
  id,
  eyebrow,
  title,
  support,
  width = 'content',
  raised = false,
  align = 'left',
  children,
}: SectionShellProps) {
  const titleId = `${id}-title`;
  return (
    <Section id={id} aria-labelledby={title ? titleId : undefined} $raised={raised}>
      <Inner $width={width} $align={align}>
        {(eyebrow || title || support) && (
          <Reveal onReveal={() => track('section_view', { id })}>
            <Header $align={align}>
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              {title && <Title id={titleId}>{title}</Title>}
              {support && <Support>{support}</Support>}
            </Header>
          </Reveal>
        )}
        {children}
      </Inner>
    </Section>
  );
}

const Section = styled.section<{ $raised: boolean }>`
  scroll-margin-top: 72px;
  padding: ${mkLayout.sectionGapMobile}px 0;
  ${({ $raised, theme }) =>
    $raised &&
    css`
      background: ${theme.color.surfaceRaised};
      border-top: 1px solid ${theme.color.line};
      border-bottom: 1px solid ${theme.color.line};
    `}
  ${({ theme }) => theme.media.sm} {
    padding: ${mkLayout.sectionGapTablet}px 0;
  }
  ${({ theme }) => theme.media.md} {
    padding: ${mkLayout.sectionGapDesktop}px 0;
  }
`;

const Inner = styled.div<{ $width: 'content' | 'narrow' | 'bleed'; $align: 'left' | 'center' }>`
  margin: 0 auto;
  ${({ $width }) =>
    $width === 'bleed'
      ? css`
          max-width: none;
        `
      : css`
          max-width: ${$width === 'narrow' ? mkLayout.narrowMax : mkLayout.contentMax}px;
          padding: 0 20px;
          @media (min-width: 640px) {
            padding: 0 32px;
          }
        `}
`;

const Header = styled.header<{ $align: 'left' | 'center' }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 720px;
  margin-bottom: ${({ theme }) => theme.space[6]}px;
  ${({ $align }) =>
    $align === 'center' &&
    css`
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    `}
  ${({ theme }) => theme.media.md} {
    margin-bottom: ${({ theme }) => theme.space[7]}px;
  }
`;

const Eyebrow = styled.p`
  ${eyebrowStyle}
`;

const Title = styled.h2`
  font-size: ${displayXL.h2};
  letter-spacing: -0.02em;
`;

const Support = styled.p`
  font-size: ${displayXL.lede};
  color: ${({ theme }) => theme.color.textSecondary};
  max-width: 56ch;
`;
