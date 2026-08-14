'use client';

/**
 * Who it's for (Section Breakdown §6) — role-tabbed benefits. WAI-ARIA tabs pattern (roving
 * tabindex, arrow keys, Home/End); default tab honors ?role= for targeted campaigns
 * (LANDING_PAGE_USER_JOURNEY.md §4). Only the active tab's CTA renders (one-primary rule).
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { track } from '../../analytics';
import { benefits, type BenefitRole } from '../../content';
import type { PreregRole } from '../../prereg/api';
import { ConversionCta } from '../ConversionCta';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

const roleParamToTab: Record<string, BenefitRole> = {
  customer: 'customers',
  vendor: 'vendors',
  seller: 'sellers',
  hub: 'businesses',
};

export function BenefitsTabs() {

  const [active, setActiveRaw] = useState<BenefitRole>('customers');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const setActive = (r: BenefitRole) => {
    setActiveRaw(r);
    track('role_tab_switch', { role: r });
  };

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('role');
    if (role && roleParamToTab[role]) setActive(roleParamToTab[role]);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const count = benefits.roles.length;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (index + 1) % count;
    else if (e.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next !== null) {
      e.preventDefault();
      const role = benefits.roles[next];
      if (role) {
        setActive(role.key);
        tabRefs.current[next]?.focus();
      }
    }
  };

  const activeRole = benefits.roles.find((r) => r.key === active) ?? benefits.roles[0];
  const reduced = useReducedMotion() ?? false;

  return (
    <SectionShell id="benefits" eyebrow={benefits.eyebrow} title={benefits.title} align="center">
      <Reveal>
        <TabList role="tablist" aria-label="Choose your role">
          {benefits.roles.map((role, i) => (
            <Tab
              key={role.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`benefits-tab-${role.key}`}
              aria-selected={role.key === active}
              aria-controls={`benefits-panel-${role.key}`}
              tabIndex={role.key === active ? 0 : -1}
              $active={role.key === active}
              onClick={() => setActive(role.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {role.key === active && (
                // Sliding active pill via layout projection (spec §6); snaps under reduced motion.
                <Pill layoutId="benefits-active-pill" transition={{ duration: 0.2 }} />
              )}
              <TabLabel>{role.tab}</TabLabel>
            </Tab>
          ))}
        </TabList>

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={activeRole.key}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: reduced ? 0.1 : 0.2, ease: [0.2, 0, 0, 1] }}
          >
            <Panel
              role="tabpanel"
              id={`benefits-panel-${activeRole.key}`}
              aria-labelledby={`benefits-tab-${activeRole.key}`}
            >
              <PanelHeading>{activeRole.heading}</PanelHeading>
              <Items>
                {activeRole.items.map((item) => (
                  <Item key={item.title}>
                    <ItemTitle>{item.title}</ItemTitle>
                    <ItemBody>{item.body}</ItemBody>
                  </Item>
                ))}
              </Items>
              <CtaRow>
                <ConversionCta
                  source="benefits"
                  role={activeRole.cta.role as PreregRole}
                  $variant="primary"
                >
                  {activeRole.cta.label}
                </ConversionCta>
              </CtaRow>
            </Panel>
          </m.div>
        </AnimatePresence>
      </Reveal>
    </SectionShell>
  );
}

const TabList = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 0 auto ${({ theme }) => theme.space[6]}px;
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  color: ${({ theme, $active }) => ($active ? theme.color.textPrimary : theme.color.textSecondary)};
  transition: color ${({ theme }) => theme.motion.standard}ms;
`;

const Pill = styled(m.span)`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;

const TabLabel = styled.span`
  position: relative;
`;

const Panel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[6]}px;
  text-align: left;
`;

const PanelHeading = styled.h3`
  font-size: 24px;
  letter-spacing: -0.02em;
  text-align: center;
  ${({ theme }) => theme.media.md} {
    font-size: 32px;
  }
`;

const Items = styled.ul`
  list-style: none;
  padding: 0;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Item = styled.li`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  align-content: start;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const ItemTitle = styled.h4`
  font-size: 16px;
`;

const ItemBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const CtaRow = styled.div`
  display: flex;
  justify-content: center;
`;
