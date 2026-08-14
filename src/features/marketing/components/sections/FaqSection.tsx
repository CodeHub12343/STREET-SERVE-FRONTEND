'use client';

/**
 * FAQ (Section Breakdown §11) — controlled disclosure accordion: button + aria-expanded +
 * region semantics, one open at a time, chevron rotates 200ms, panel height animates 250ms
 * decelerate (duration 0 under reduced motion) — animation spec §6. Deep links (#faq-{slug})
 * auto-open their item. The FAQPage JSON-LD is emitted server-side from the same content.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { track } from '../../analytics';
import { faq } from '../../content';
import { Reveal } from '../../motion/Reveal';
import { SectionShell } from '../SectionShell';

export function FaqSection() {
  const [open, setOpen] = useState<string | null>(null);
  const reduced = useReducedMotion() ?? false;

  // Deep link (#faq-{slug}) opens and scrolls to its item.
  useEffect(() => {
    const slug = window.location.hash.replace('#faq-', '');
    if (slug && faq.items.some((i) => i.slug === slug)) {
      setOpen(slug);
      document.getElementById(`faq-${slug}`)?.scrollIntoView();
    }
  }, []);

  return (
    <SectionShell id="faq" eyebrow={faq.eyebrow} title={faq.title} width="narrow" align="center">
      <Reveal>
        <List>
          {faq.items.map((item) => {
            const expanded = open === item.slug;
            return (
              <Item key={item.slug} id={`faq-${item.slug}`}>
                <QuestionButton
                  type="button"
                  id={`faq-q-${item.slug}`}
                  aria-expanded={expanded}
                  aria-controls={`faq-answer-${item.slug}`}
                  onClick={() => {
                    if (!expanded) track('faq_expand', { q: item.slug });
                    setOpen(expanded ? null : item.slug);
                  }}
                >
                  <span>{item.q}</span>
                  <Chevron aria-hidden $open={expanded}>
                    ▾
                  </Chevron>
                </QuestionButton>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <m.div
                      id={`faq-answer-${item.slug}`}
                      role="region"
                      aria-labelledby={`faq-q-${item.slug}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: reduced ? 0 : 0.25,
                        ease: [0.2, 0, 0, 1],
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Answer>{item.a}</Answer>
                    </m.div>
                  )}
                </AnimatePresence>
              </Item>
            );
          })}
        </List>
      </Reveal>
    </SectionShell>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  text-align: left;
`;

const Item = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  scroll-margin-top: 88px;
`;

const QuestionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  font-weight: 700;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radius.card}px;
`;

const Chevron = styled.span<{ $open: boolean }>`
  color: ${({ theme }) => theme.color.textSecondary};
  transition: transform ${({ theme }) => theme.motion.standard}ms;
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
`;

const Answer = styled.p`
  padding: 0 ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[5]}px;
  font-size: 15px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;
