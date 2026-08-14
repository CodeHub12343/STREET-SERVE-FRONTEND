'use client';

/**
 * C-38 Help & support (docs/13 C-38) — FAQ, contact, and the dispute entry point (a first-class
 * dispute case object, FR-10.2). The dispute form itself is opened from here.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { ChevronDown, LifeBuoy } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';

const FAQ = [
  { q: 'How does the line-up discount work?', a: 'The earlier you join a vendor’s line, the bigger your locked discount. It applies automatically at checkout — no code needed.' },
  { q: 'When do I get charged for a wave-down?', a: 'Never for sending a wave. You only pay when you order and check out.' },
  { q: 'What if a vendor cancels my order?', a: 'You’re not charged for cancelled items, and you’ll see the reason in your order tracker.' },
  { q: 'How do payouts work for sellers?', a: 'Payout speed depends on your tier — Bronze holds 3 days, Silver next-day, Gold instant.' },
];

export function Help() {
  const router = useRouter();
  const { show } = useToast();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <TabPage title="Help & support">
      <SectionTitle>FAQ</SectionTitle>
      <List>
        {FAQ.map((item, i) => (
          <Item key={i}>
            <Q onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {item.q}
              <ChevronDown size={18} style={{ transform: open === i ? 'rotate(180deg)' : 'none' }} aria-hidden />
            </Q>
            {open === i ? <A>{item.a}</A> : null}
          </Item>
        ))}
      </List>

      <SectionTitle>Still need help?</SectionTitle>
      <Actions>
        <Button variant="secondary" onClick={() => show('Opening support chat (demo)', 'default')}>
          <LifeBuoy size={16} /> Contact support
        </Button>
        <Button variant="tertiary" onClick={() => router.push('/disputes/new')}>
          Open a dispute
        </Button>
      </Actions>
    </TabPage>
  );
}

const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[2]}px;
  &:first-child {
    margin-top: 0;
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div`
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  overflow: hidden;
`;
const Q = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[4]}px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const A = styled.p`
  padding: 0 ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[4]}px;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
