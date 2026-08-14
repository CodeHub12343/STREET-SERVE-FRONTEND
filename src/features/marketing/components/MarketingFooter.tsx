'use client';

/**
 * Marketing footer (IA §6) — link columns, "stay in the loop" block (anchors to the waitlist CTA
 * rather than a second competing capture, per IA §1 note), theme toggle, legal line.
 */
import Image from 'next/image';
import Link from 'next/link';
import styled from 'styled-components';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { useThemeStore, type ThemePreference } from '@/stores/theme.store';
import { footer } from '../content';
import { marketingConfig } from '../marketing.config';

const themeSegments: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function MarketingFooter() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Root>
      <Inner>
        <Brand>
          <BrandMark>
            <LogoImg src={marketingConfig.logoSrc} alt="" width={44} height={44} />
            <span>StreetServe</span>
          </BrandMark>
          <Tagline>{footer.tagline}</Tagline>
        </Brand>

        <Columns>
          {footer.columns.map((col) => (
            <Column key={col.title}>
              <ColumnTitle>{col.title}</ColumnTitle>
              <ColumnList>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') || link.href.startsWith('mailto:') ? (
                      <FooterAnchor href={link.href}>{link.label}</FooterAnchor>
                    ) : (
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    )}
                  </li>
                ))}
              </ColumnList>
            </Column>
          ))}

          <Column>
            <ColumnTitle>{footer.newsletter.title}</ColumnTitle>
            <NewsletterBody>{footer.newsletter.body}</NewsletterBody>
            <FooterAnchor href={footer.newsletter.cta.href}>
              {footer.newsletter.cta.label} →
            </FooterAnchor>
          </Column>
        </Columns>

        <Bottom>
          <LegalLine>{footer.legalLine}</LegalLine>
          <SegmentedControl
            segments={themeSegments}
            value={preference}
            onChange={setPreference}
            ariaLabel="Color theme"
          />
        </Bottom>
      </Inner>
    </Root>
  );
}

const Root = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[7]}px 20px ${({ theme }) => theme.space[5]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[6]}px;
  ${({ theme }) => theme.media.sm} {
    padding-left: 32px;
    padding-right: 32px;
  }
`;

const Brand = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const BrandMark = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.02em;
`;

const LogoImg = styled(Image)`
  border-radius: 50%;
  object-fit: cover;
`;

const Tagline = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 15px;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[6]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Column = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  align-content: start;
`;

const ColumnTitle = styled.h3`
  font-size: 14px;
  font-weight: 750;
`;

const ColumnList = styled.ul`
  list-style: none;
  padding: 0;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const linkStyles = `
  font-size: 14px;
  display: inline-block;
  padding: 2px 0;
`;

const FooterLink = styled(Link)`
  ${linkStyles}
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const FooterAnchor = styled.a`
  ${linkStyles}
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const NewsletterBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Bottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  padding-top: ${({ theme }) => theme.space[5]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const LegalLine = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
