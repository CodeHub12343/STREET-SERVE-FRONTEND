'use client';

/**
 * C-29 Gift redemption (docs/12 §2) — the recipient (possibly a guest) enters/opens a code and
 * redeems it. Public route.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Gift } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { demoGiftRedemption } from '@/lib/demo';
import { formatCents } from '@/lib/money';

export function GiftRedemption({ code }: { code: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [redeemed, setRedeemed] = useState(false);

  const gift = useQuery({
    queryKey: ['gift', code],
    queryFn: () => (isMapDemo ? Promise.resolve(demoGiftRedemption(code)) : api.get<ReturnType<typeof demoGiftRedemption>>(`/gifts/${code}`)),
  });

  const redeem = useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.post(endpoints.giftRedeem(code))),
    onSuccess: () => {
      setRedeemed(true);
      show('Gift redeemed 🎁', 'success');
    },
  });

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="You’ve got a gift"
      footer={
        redeemed ? (
          <Button fullWidth onClick={() => router.replace('/map')}>Find them on the map</Button>
        ) : (
          <Button fullWidth loading={redeem.isPending} onClick={() => redeem.mutate()}>Redeem now</Button>
        )
      }
    >
      {gift.isLoading || !gift.data ? (
        <Skeleton $h="160px" $radius={16} />
      ) : (
        <Card>
          <Glyph aria-hidden><Gift size={32} /></Glyph>
          <Big>{formatCents(gift.data.amountCents)}</Big>
          <p>{gift.data.from} sent you a gift for <b>{gift.data.businessName}</b> — {gift.data.item}.</p>
          {redeemed ? <Redeemed>Redeemed! Show this at {gift.data.businessName}.</Redeemed> : <Code>{code}</Code>}
        </Card>
      )}
    </WizardFlow>
  );
}

const Card = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  text-align: center;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
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
const Big = styled.p`
  font-size: 40px;
  font-weight: 800;
`;
const Code = styled.p`
  font-family: monospace;
  font-size: 18px;
  letter-spacing: 0.1em;
`;
const Redeemed = styled.p`
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusLive} !important;
`;
