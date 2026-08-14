'use client';

/**
 * C-06 Role intent selector — "I'm here to: find / sell / run a business". Sets the initial mode;
 * all roles are addable later (additive model). Selecting sell/business adds that role via
 * POST /auth/roles; "find" is the default customer capability and needs no extra call.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Search, DollarSign, Store, Warehouse } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { useModeStore } from '@/stores/mode.store';
import { AppApiError } from '@/lib/api/errors';
import { useAddRole } from '../hooks/useProfile';
import { INTENT_TO_ROLE, type RoleIntent } from '../types';
import { ONBOARDING_TOTAL, nextPath, prevPath, stepNumber } from '../onboarding';

const OPTIONS: { intent: RoleIntent; icon: React.ReactNode; title: string; body: string }[] = [
  { intent: 'find', icon: <Search size={22} />, title: 'Find what’s near me', body: 'Discover vendors, wave them down, order and book.' },
  { intent: 'sell', icon: <DollarSign size={22} />, title: 'Sell on the street', body: 'Take consignment inventory and earn — no upfront cost.' },
  { intent: 'business', icon: <Store size={22} />, title: 'Run a business', body: 'Go live on the map, manage a queue, take orders.' },
  { intent: 'hub', icon: <Warehouse size={22} />, title: 'Run a consignment hub', body: 'Stock street sellers from your storefront & settle automatically.' },
];

export function RoleStep() {
  const router = useRouter();
  const { show } = useToast();
  const addRole = useAddRole();
  const setMode = useModeStore((s) => s.setMode);
  const [intent, setIntent] = useState<RoleIntent>('find');

  const onContinue = () => {
    const role = INTENT_TO_ROLE[intent];
    const proceed = () => {
      setMode(
        intent === 'business'
          ? 'vendor'
          : intent === 'sell'
            ? 'seller'
            : intent === 'hub'
              ? 'hub'
              : 'customer',
      );
      router.push(nextPath('/onboarding/role'));
    };
    if (role === 'customer') {
      proceed();
      return;
    }
    addRole.mutate(role, {
      onSuccess: proceed,
      onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not add role', 'danger'),
    });
  };

  const back = prevPath('/onboarding/role');

  return (
    <WizardFlow
      totalSteps={ONBOARDING_TOTAL}
      currentStep={stepNumber('/onboarding/role')}
      title="What brings you here?"
      onBack={back ? () => router.push(back) : undefined}
      footer={
        <Button fullWidth loading={addRole.isPending} onClick={onContinue}>
          Continue
        </Button>
      }
    >
      <Hint>You can add the others anytime — one account does it all.</Hint>
      <Options role="radiogroup" aria-label="What brings you here?">
        {OPTIONS.map((o) => (
          <Option
            key={o.intent}
            role="radio"
            aria-checked={intent === o.intent}
            $active={intent === o.intent}
            onClick={() => setIntent(o.intent)}
          >
            <Icon aria-hidden>{o.icon}</Icon>
            <div>
              <strong>{o.title}</strong>
              <span>{o.body}</span>
            </div>
          </Option>
        ))}
      </Options>
    </WizardFlow>
  );
}

const Hint = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  text-align: left;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  cursor: pointer;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  transition: border-color ${({ theme }) => theme.motion.standard}ms;

  strong {
    display: block;
    font-size: 15px;
  }
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Icon = styled.span`
  display: inline-flex;
  flex: none;
  color: ${({ theme }) => theme.color.accentPrimary};
`;
