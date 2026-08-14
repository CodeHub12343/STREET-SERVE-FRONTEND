'use client';

/**
 * Marketing nav (IA §3.1) — sticky; transparent over the hero, gains the glass surface after
 * 24px of scroll. Center anchors (≥1024px) with active-section highlight via IntersectionObserver;
 * mobile collapses to wordmark + primary CTA + hamburger opening a full-snap Sheet menu.
 */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styled, { css } from 'styled-components';
import { Sheet } from '@/components/primitives/Sheet';


import { ConversionCta } from './ConversionCta';
import { cta, navLinks } from '../content';
import { marketingConfig } from '../marketing.config';
import { glass } from '../mk';

export function MarketingNav() {

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // Mobile hide/reveal (animation spec §6): hide scrolling down past the hero, show on any
      // scroll-up. Desktop ignores `hidden` via CSS.
      if (y > 480 && y > lastY + 4) setHidden(true);
      else if (y < lastY - 4 || y <= 480) setHidden(false);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sectionIds = useMemo(() => navLinks.map((l) => l.href.slice(1)), []);

  // Active-anchor highlight: the topmost section crossing the upper half of the viewport wins.
  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <>
      <Bar $scrolled={scrolled} $hidden={hidden}>
        <Inner>
          <Wordmark href="#hero" aria-label="StreetServe — back to top">
            <LogoImg
              src={marketingConfig.logoSrc}
              alt=""
              width={36}
              height={36}
              priority
            />
            <span>StreetServe</span>
          </Wordmark>

          <Anchors aria-label="Page sections">
            {navLinks.map((l) => (
              <AnchorLink key={l.href} href={l.href} $active={active === l.href.slice(1)}>
                {l.label}
              </AnchorLink>
            ))}
          </Anchors>

          <Actions>
            <SignIn href={marketingConfig.signInHref}>Sign in</SignIn>
            <ConversionCta source="nav" $variant="primary" $size="compact">
              {cta.compact}
            </ConversionCta>
            <MenuButton
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span aria-hidden>☰</span>
            </MenuButton>
          </Actions>
        </Inner>
      </Bar>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        initialSnap="full"
        ariaLabel="Menu"
      >
        <MenuList>
          {navLinks.map((l) => (
            <MenuLink key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </MenuLink>
          ))}
          <MenuLink href={marketingConfig.signInHref} onClick={() => setMenuOpen(false)}>
            Sign in
          </MenuLink>
          <MenuCta>
            <ConversionCta
              source="nav-menu"
              $variant="primary"
              $fullWidth
              onClickCapture={() => setMenuOpen(false)}
            >
              {cta.primary}
            </ConversionCta>
          </MenuCta>
        </MenuList>
      </Sheet>
    </>
  );
}

const Bar = styled.div<{ $scrolled: boolean; $hidden: boolean }>`
  position: sticky;
  top: 0;
  z-index: 50;
  transition:
    background ${({ theme }) => theme.motion.standard}ms,
    border-color ${({ theme }) => theme.motion.standard}ms,
    transform 250ms ${({ theme }) => theme.motion.easeOut};
  border-bottom: 1px solid transparent;
  transform: translateY(${({ $hidden }) => ($hidden ? '-100%' : '0')});
  ${({ theme }) => theme.media.md} {
    transform: none;
  }
  ${({ $scrolled, theme }) =>
    $scrolled &&
    css`
      ${glass(theme)}
      border-bottom-color: ${theme.color.line};
    `}
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.md} {
    height: 64px;
    padding: 0 32px;
  }
`;

const Wordmark = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: 800;
  font-size: 17px;
  letter-spacing: -0.02em;
`;

const LogoImg = styled(Image)`
  border-radius: 50%;
  object-fit: cover;
`;

const Anchors = styled.nav`
  display: none;
  ${({ theme }) => theme.media.md} {
    display: flex;
    gap: ${({ theme }) => theme.space[2]}px;
  }
`;

const AnchorLink = styled.a<{ $active: boolean }>`
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 14px;
  font-weight: 650;
  color: ${({ theme, $active }) => ($active ? theme.color.textPrimary : theme.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised2 : 'transparent')};
  transition:
    color ${({ theme }) => theme.motion.micro}ms,
    background ${({ theme }) => theme.motion.micro}ms;
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const SignIn = styled(Link)`
  display: none;
  font-size: 14px;
  font-weight: 650;
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.textPrimary};
  }
  ${({ theme }) => theme.media.sm} {
    display: inline;
  }
`;

const MenuButton = styled.button`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 20px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.control}px;
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

const MenuList = styled.nav`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
`;

const MenuLink = styled.a`
  padding: 14px 12px;
  font-size: 18px;
  font-weight: 700;
  border-radius: ${({ theme }) => theme.radius.control}px;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;

const MenuCta = styled.div`
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
