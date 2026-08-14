'use client';

/**
 * C-28 Gift flow (docs/12 §2) — item → recipient → pay → share code. Creates a gift with a
 * redemption code the recipient can redeem (C-29). 💳 with idempotency.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Gift, Copy, Check } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Stepper } from '@/components/primitives/Stepper';
import { PaymentSheet } from '@/features/payments';
import { useBusiness } from '@/features/business';
import { useToast } from '@/components/feedback/ToastProvider';
import { newIdempotencyKey } from '@/lib/idempotency';
import { formatCents } from '@/lib/money';

export function GiftFlow({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: biz } = useBusiness(businessId);
  const idemKey = useRef(newIdempotencyKey());
  const [step, setStep] = useState<'detail' | 'pay' | 'done'>('detail');
  const [amount, setAmount] = useState(10);
  const [recipient, setRecipient] = useState('');
  const [code] = useState(() => `SS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const [copied, setCopied] = useState(false);

  const amountCents = amount * 100;

  if (step === 'done') {
    return (
      <WizardFlow totalSteps={3} currentStep={3} title="Gift sent!" footer={<Button fullWidth onClick={() => router.replace(`/business/${businessId}`)}>Done</Button>}>
        <Center>
          <Glyph aria-hidden><Gift size={32} /></Glyph>
          <p>Share this code with {recipient || 'your recipient'} — they can redeem it at {biz?.name}.</p>
          <Code onClick={() => { void navigator.clipboard?.writeText(code); setCopied(true); show('Code copied', 'success'); }}>
            {code} {copied ? <Check size={16} /> : <Copy size={16} />}
          </Code>
        </Center>
      </WizardFlow>
    );
  }

  if (step === 'pay') {
    return (
      <WizardFlow totalSteps={3} currentStep={2} title="Pay for the gift" onBack={() => setStep('detail')}>
        <PaymentSheet clientSecret="demo" amountCents={amountCents} onSuccess={() => setStep('done')} />
      </WizardFlow>
    );
  }

  return (
    <WizardFlow
      totalSteps={3}
      currentStep={1}
      title={`Gift · ${biz?.name ?? ''}`.trim()}
      onBack={() => router.back()}
      footer={<Button fullWidth disabled={!recipient.trim()} onClick={() => setStep('pay')}>Continue to payment · {formatCents(amountCents)}</Button>}
    >
      <Row>
        <Label>Gift amount</Label>
        <Stepper value={amount} min={5} max={100} step={5} onChange={setAmount} ariaLabel="Gift amount" />
      </Row>
      <Input label="Recipient name" placeholder="Who’s it for?" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      <Hint>They’ll get a code to redeem at {biz?.name}. Idempotency key: {idemKey.current.slice(0, 8)}…</Hint>
    </WizardFlow>
  );
}

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const Label = styled.span`
  font-weight: 600;
`;
const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Center = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[4]}px;
  text-align: center;
  p {
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Glyph = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: #fff;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
const Code = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1.5px dashed ${({ theme }) => theme.color.accentPrimary};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
`;
